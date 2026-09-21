import { prisma } from '@/lib/prisma';
import { MeetingInput, AttendeeInput, Source } from '@/types';
import { searchPerson, searchCompany, searchTopic } from './research';
import {
  synthesizeAttendeeProfile,
  synthesizeCompanyResearch,
  synthesizeTopicBriefs,
  generateMeetingBrief,
  extractMeetingTopics,
} from './llm';
import {
  TAVILY_TOTAL_CONTEXT_MAX_CHARS,
  enforceTotalContextLimit,
} from '@/lib/tavily-guardrails';

export interface ResearchProgress {
  stage: 'extracting' | 'attendees' | 'companies' | 'topics' | 'synthesizing' | 'complete' | 'error';
  message: string;
  progress: number;
}

function stringify(value: unknown): string {
  return JSON.stringify(value);
}

export async function runResearchPipeline(
  meetingId: string,
  onProgress?: (progress: ResearchProgress) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'RESEARCHING' },
    });

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { attendees: true },
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const meetingInput: MeetingInput = {
      title: meeting.title,
      description: meeting.description || undefined,
      agenda: meeting.agenda || undefined,
      dateTime: meeting.dateTime.toISOString(),
      duration: meeting.duration || undefined,
      location: meeting.location || undefined,
      meetingUrl: meeting.meetingUrl || undefined,
      attendees: meeting.attendees.map(a => ({
        name: a.name,
        email: a.email || undefined,
        role: a.role || undefined,
        company: a.company || undefined,
        linkedin: a.linkedin || undefined,
        twitter: a.twitter || undefined,
        notes: a.notes || undefined,
      })),
    };

    onProgress?.({ stage: 'extracting', message: 'Extracting meeting topics...', progress: 10 });

    let topics: string[] = [];
    try {
      topics = await extractMeetingTopics(meeting.agenda || '', meeting.description || '');
    } catch (e) {
      console.warn('Topic extraction failed, continuing with empty topics:', e);
      topics = [];
    }
    
    onProgress?.({ stage: 'attendees', message: 'Researching attendees...', progress: 25 });

    const attendeeProfiles = new Map<string, NonNullable<Awaited<ReturnType<typeof synthesizeAttendeeProfile>>>>();
    const allSources: Source[] = [];

    // Partial-failure tracking for attendees
    let attendeeSuccess = 0;
    let attendeeFailed = 0;
    const totalAttendees = meetingInput.attendees.length;

    for (let i = 0; i < totalAttendees; i++) {
      const attendee = meetingInput.attendees[i];
      onProgress?.({ 
        stage: 'attendees', 
        message: `Researching ${attendee.name}...`, 
        progress: 25 + (i / Math.max(1, totalAttendees)) * 25 
      });

      try {
        // searchPerson internally: dedupes queries, max 3, 5k context, per-query isolation, 10s timeout/retry
        const personResults = await searchPerson(attendee.name, attendee.company);

        // Defense-in-depth: re-enforce 5k total context before LLM (research already does)
        const boundedResults = enforceTotalContextLimit(personResults, TAVILY_TOTAL_CONTEXT_MAX_CHARS);

        const profile = await synthesizeAttendeeProfile(attendee.name, attendee.company, boundedResults);
        
        if (profile) {
          attendeeProfiles.set(attendee.name, profile);
          allSources.push(...profile.sources);
          attendeeSuccess++;
          
          const attendeeRecord = meeting.attendees.find(a => a.name === attendee.name);
          if (attendeeRecord) {
            await prisma.attendeeProfile.upsert({
              where: { attendeeId: attendeeRecord.id },
              create: {
                attendeeId: attendeeRecord.id,
                currentRole: profile.currentRole,
                currentCompany: profile.currentCompany,
                previousRoles: stringify(profile.previousRoles),
                expertise: stringify(profile.expertise),
                notableProjects: stringify(profile.notableProjects),
                interests: stringify(profile.interests),
                bio: profile.bio,
                avatarUrl: profile.avatarUrl,
                sources: stringify(profile.sources),
              },
              update: {
                currentRole: profile.currentRole,
                currentCompany: profile.currentCompany,
                previousRoles: stringify(profile.previousRoles),
                expertise: stringify(profile.expertise),
                notableProjects: stringify(profile.notableProjects),
                interests: stringify(profile.interests),
                bio: profile.bio,
                avatarUrl: profile.avatarUrl,
                sources: stringify(profile.sources),
              },
            });
          }
        } else {
          // Synthesize returned null — treat as partial failure (no data), not fatal
          attendeeFailed++;
          console.warn(`No profile synthesized for ${attendee.name} (empty or LLM failure)`);
        }
      } catch (e) {
        attendeeFailed++;
        console.warn(`Research failed for attendee ${attendee.name}, continuing:`, e);
        // Continue to next attendee — partial failure support
      }
    }

    if (totalAttendees > 0) {
      const msg =
        attendeeFailed > 0
          ? `Research completed for ${attendeeSuccess}/${totalAttendees} attendees${attendeeFailed ? ` (${attendeeFailed} failed)` : ''}`
          : `Research completed for ${attendeeSuccess}/${totalAttendees} attendees`;
      console.info(msg);
      onProgress?.({ stage: 'attendees', message: msg, progress: 50 });
    }

    onProgress?.({ stage: 'companies', message: 'Researching companies...', progress: 50 });

    const uniqueCompanies = Array.from(new Set(meetingInput.attendees.map(a => a.company).filter(Boolean) as string[]));
    const companyResearch: NonNullable<Awaited<ReturnType<typeof synthesizeCompanyResearch>>>[] = [];

    let companySuccess = 0;
    let companyFailed = 0;
    const totalCompanies = uniqueCompanies.length;

    for (let i = 0; i < totalCompanies; i++) {
      const company = uniqueCompanies[i];
      
      onProgress?.({ 
        stage: 'companies', 
        message: `Researching ${company}...`, 
        progress: 50 + (i / Math.max(1, totalCompanies)) * 20 
      });

      try {
        const companyResults = await searchCompany(company);
        const bounded = enforceTotalContextLimit(companyResults, TAVILY_TOTAL_CONTEXT_MAX_CHARS);
        const research = await synthesizeCompanyResearch(company, bounded);
        
        if (research) {
          companyResearch.push(research);
          allSources.push(...research.sources);
          companySuccess++;

          const companyRecord = await prisma.company.upsert({
            where: { name: company },
            create: { name: company },
            update: {},
          });

          await prisma.companyResearch.upsert({
            where: { companyId_meetingId: { companyId: companyRecord.id, meetingId } },
            create: {
              companyId: companyRecord.id,
              meetingId,
              summary: research.summary,
              recentNews: stringify(research.recentNews),
              products: stringify(research.products),
              keyPeople: stringify(research.keyPeople),
              insights: research.insights,
              sources: stringify(research.sources),
            },
            update: {
              summary: research.summary,
              recentNews: stringify(research.recentNews),
              products: stringify(research.products),
              keyPeople: stringify(research.keyPeople),
              insights: research.insights,
              sources: stringify(research.sources),
            },
          });
        } else {
          companyFailed++;
          console.warn(`No research synthesized for company ${company}`);
        }
      } catch (e) {
        companyFailed++;
        console.warn(`Research failed for company ${company}, continuing:`, e);
      }
    }

    if (totalCompanies > 0 && companyFailed > 0) {
      const msg = `Research completed for ${companySuccess}/${totalCompanies} companies (${companyFailed} failed)`;
      console.info(msg);
      onProgress?.({ stage: 'companies', message: msg, progress: 70 });
    }

    onProgress?.({ stage: 'topics', message: 'Researching topics...', progress: 70 });

    const topicBriefs: NonNullable<Awaited<ReturnType<typeof synthesizeTopicBriefs>>> = [];

    if (topics.length > 0) {
      try {
        // searchTopic: 1 query per topic, max 10 results, 5k context budget
        // Join topics into single query budget-friendly, pipeline enforces single call
        const topicResults = await searchTopic(topics.join(' '), meeting.description || '');
        const boundedTopic = enforceTotalContextLimit(topicResults, TAVILY_TOTAL_CONTEXT_MAX_CHARS);
        const briefs = await synthesizeTopicBriefs(topics, meeting.description || '', boundedTopic);
        
        for (const brief of briefs) {
          allSources.push(...brief.sources);
        }
        topicBriefs.push(...briefs);
      } catch (e) {
        console.warn('Topic research failed, continuing without topics:', e);
        // Partial failure: topics are supplementary, pipeline continues
      }
    }

    onProgress?.({ stage: 'synthesizing', message: 'Generating meeting brief...', progress: 85 });

    const brief = await generateMeetingBrief(
      meetingInput,
      attendeeProfiles,
      companyResearch,
      topicBriefs,
      allSources
    );

    if (brief) {
      await prisma.brief.upsert({
        where: { meetingId },
        create: {
          meetingId,
          tldr: stringify(brief.tldr),
          attendeeSummaries: stringify(brief.attendeeSummaries),
          companyContext: stringify(brief.companyContext),
          topicBriefs: stringify(brief.topicBriefs),
          talkingPoints: stringify(brief.talkingPoints),
          conversationStarters: stringify(brief.conversationStarters),
          questions: stringify(brief.questions),
          watchOuts: stringify(brief.watchOuts),
          sources: stringify(brief.sources),
        },
        update: {
          tldr: stringify(brief.tldr),
          attendeeSummaries: stringify(brief.attendeeSummaries),
          companyContext: stringify(brief.companyContext),
          topicBriefs: stringify(brief.topicBriefs),
          talkingPoints: stringify(brief.talkingPoints),
          conversationStarters: stringify(brief.conversationStarters),
          questions: stringify(brief.questions),
          watchOuts: stringify(brief.watchOuts),
          sources: stringify(brief.sources),
          version: { increment: 1 },
        },
      });
    }

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'COMPLETED' },
    });

    // Final partial-failure-aware summary
    let completeMsg = 'Research complete!';
    if (totalAttendees > 0 && attendeeFailed > 0) {
      completeMsg = `Research completed for ${attendeeSuccess}/${totalAttendees} attendees`;
      if (totalCompanies > 0) completeMsg += `, ${companySuccess}/${totalCompanies} companies`;
      if (attendeeFailed > 0 || companyFailed > 0) completeMsg += ' — partial results, some queries failed';
    }
    onProgress?.({ stage: 'complete', message: completeMsg, progress: 100 });

    return { success: true };
  } catch (error) {
    console.error('Research pipeline error:', error);
    
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'DRAFT' },
    });

    onProgress?.({ 
      stage: 'error', 
      message: error instanceof Error ? error.message : 'Research failed', 
      progress: 0 
    });

    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getMeetingBrief(meetingId: string) {
  return prisma.brief.findUnique({ where: { meetingId } });
}

export async function getMeetingWithResearch(meetingId: string) {
  return prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      attendees: { include: { profile: true } },
      research: true,
      brief: true,
    },
  });
}
