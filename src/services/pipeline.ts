import { prisma } from '@/lib/prisma';
import { MeetingInput, Source } from '@/types';
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
import { createNotification } from '@/lib/notifications';
import type { StreamEvent } from '@/lib/stream';
import { cache, getTtlFor } from '@/lib/cache';
import { createLimiter } from '@/lib/semaphore';
import { Benchmark } from '@/lib/benchmark';
import { globalBudget, BUDGET } from '@/lib/budget';
import { tavilyCircuitBreaker } from '@/lib/circuit-breaker';

export interface ResearchProgress {
  stage: 'extracting' | 'attendees' | 'companies' | 'topics' | 'synthesizing' | 'complete' | 'error';
  message: string;
  progress: number;
}

function stringify(value: unknown): string {
  return JSON.stringify(value);
}

// ──────────────────────────────────────────────────────────────────────────────
// Smart planner helpers
// ──────────────────────────────────────────────────────────────────────────────

function normalizeKey(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

function isHostAttendee(
  attendee: { name: string; email?: string | null },
  hostName?: string | null,
  hostEmail?: string | null
): boolean {
  const aName = normalizeKey(attendee.name);
  const hName = normalizeKey(hostName);
  if (hName && aName && aName === hName) return true;
  const aEmail = normalizeKey(attendee.email);
  const hEmail = normalizeKey(hostEmail);
  if (hEmail && aEmail && aEmail === hEmail) return true;
  return false;
}

function dedupeAttendees<T extends { name: string; company?: string | null }>(attendees: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const a of attendees) {
    const key = `${a.name.trim().toLowerCase()}|${(a.company ?? '').trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

function fnvHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function hashForLLM(parts: unknown): string {
  const str = typeof parts === 'string' ? parts : JSON.stringify(parts);
  const h1 = fnvHash(str);
  const h2 = fnvHash(str.split('').reverse().join(''));
  return `${h1}${h2}`;
}

// LLM caching wrappers — short-circuit if cache hit for company/topic, skip LLM
async function cachedSynthesizeAttendeeProfile(
  name: string,
  company: string | undefined,
  results: Array<{ title: string; url: string; snippet: string; source: string; credibility: string }>,
  refresh?: boolean
): Promise<Awaited<ReturnType<typeof synthesizeAttendeeProfile>>> {
  // Cache key includes name+company+results length/content hash (deduped)
  const contentHash = hashForLLM(results.slice(0, 2).map((r) => r.url).join('|') + `|${results.length}`);
  const key = `llm:attendee:${fnvHash(`${name.toLowerCase()}|${(company ?? '').toLowerCase()}|${contentHash}`)}`;
  if (!refresh) {
    const cached = await cache.get<Awaited<ReturnType<typeof synthesizeAttendeeProfile>>>(key);
    if (cached) {
      console.info(`[cache] LLM attendee hit: ${name}`);
      return cached;
    }
  }
  const profile = await synthesizeAttendeeProfile(name, company, results);
  if (profile) {
    await cache.set(key, profile, getTtlFor('identity')).catch(() => {});
  }
  return profile;
}

async function cachedSynthesizeCompanyResearch(
  company: string,
  results: Array<{ title: string; url: string; snippet: string; source: string; credibility: string }>,
  refresh?: boolean
): Promise<Awaited<ReturnType<typeof synthesizeCompanyResearch>>> {
  const contentHash = hashForLLM(results.slice(0, 2).map((r) => r.url).join('|') + `|${results.length}`);
  const key = `company:research:${fnvHash(`${company.toLowerCase()}|${contentHash}`)}`;
  if (!refresh) {
    const cached = await cache.get<Awaited<ReturnType<typeof synthesizeCompanyResearch>>>(key);
    if (cached) {
      console.info(`[cache] LLM company hit: ${company} — skipping LLM`);
      return cached;
    }
  }
  const research = await synthesizeCompanyResearch(company, results);
  if (research) {
    await cache.set(key, research, getTtlFor('company')).catch(() => {});
  }
  return research;
}

async function cachedSynthesizeTopicBriefs(
  topics: string[],
  context: string,
  results: Array<{ title: string; url: string; snippet: string; source: string; credibility: string }>,
  refresh?: boolean
): Promise<Awaited<ReturnType<typeof synthesizeTopicBriefs>>> {
  const keyRaw = `${topics.join('|').toLowerCase()}|${hashForLLM(results.slice(0, 2).map((r) => r.url).join('|'))}`;
  const key = `company:topic:${fnvHash(keyRaw)}`;
  if (!refresh) {
    const cached = await cache.get<Awaited<ReturnType<typeof synthesizeTopicBriefs>>>(key);
    if (cached) {
      console.info(`[cache] LLM topic hit: ${topics.join(',').slice(0, 40)} — skipping LLM`);
      return cached;
    }
  }
  const briefs = await synthesizeTopicBriefs(topics, context, results);
  if (briefs && briefs.length) {
    await cache.set(key, briefs, getTtlFor('company')).catch(() => {});
  }
  return briefs;
}

// Budget helper: already enforced in research.ts, but pipeline also checks before launching
function budgetRemaining(): number {
  return BUDGET.MAX_TOTAL_TAVILY_QUERIES - globalBudget.getTavilyCount();
}

// ──────────────────────────────────────────────────────────────────────────────
// Main pipeline — optimized with smart planner, bounded parallel, caching, budget, breaker, benchmark
// ──────────────────────────────────────────────────────────────────────────────

export async function runResearchPipeline(
  meetingId: string,
  onProgress?: (progress: ResearchProgress) => void,
  opts?: { refresh?: boolean; onEvent?: (e: StreamEvent) => void }
): Promise<{ success: boolean; error?: string }> {
  const refresh = !!opts?.refresh;
  const onEvent = opts?.onEvent;
  const emit = (e: StreamEvent) => { try { onEvent?.(e); } catch {} };
  const bench = new Benchmark();
  bench.start('pipeline:total');
  console.time('pipeline:total');
  // Reset per-pipeline budget (but not circuit breaker — it is process-wide)
  // Note: globalBudget is process-wide; we reset at start of each pipeline to enforce per-meeting cap
  // For concurrent pipelines, this would race — but single-pipeline assumption is fine (research already locked via DB status)
  globalBudget.reset();

  let meetingTitle = meetingId;
  try {
    bench.start('db:fetchMeeting');
    console.time('db:fetchMeeting');
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'RESEARCHING' },
    });

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { attendees: true },
    });
    bench.end('db:fetchMeeting');
    try { console.timeEnd('db:fetchMeeting'); } catch {}

    if (!meeting) {
      throw new Error('Meeting not found');
    }
    meetingTitle = meeting.title;
    emit({ type: 'stage', stage: '01_MEETING_PARSED', status: 'done', message: `Meeting parsed: ${meeting.title}` });
    emit({ type: 'meeting', data: { id: meeting.id, title: meeting.title, dateTime: meeting.dateTime, hostName: meeting.hostName, attendees: meeting.attendees } });

    // Smart planner: filter host, dedupe attendees, dedupe companies, use provided fields
    const allAttendeesRaw = meeting.attendees.map(a => ({
      name: a.name,
      email: a.email || undefined,
      role: a.role || undefined,
      company: a.company || undefined,
      linkedin: a.linkedin || undefined,
      twitter: a.twitter || undefined,
      notes: a.notes || undefined,
      github: (a as unknown as { github?: string }).github || undefined,
      githubUsername: (a as unknown as { githubUsername?: string }).githubUsername || undefined,
      _id: a.id,
    }));

    // Host not researched as external (spec §8)
    const attendeesFiltered = allAttendeesRaw.filter(a => !isHostAttendee(a, meeting.hostName, meeting.hostEmail));
    if (attendeesFiltered.length < allAttendeesRaw.length) {
      console.info(`[planner] filtered host attendee: ${allAttendeesRaw.length - attendeesFiltered.length} excluded`);
    }

    // Deduplicate attendees by name+company (smart planner: dedupe queries)
    const dedupedAttendees = dedupeAttendees(attendeesFiltered as unknown as Array<{ name: string; company?: string | null }>) as typeof attendeesFiltered;
    if (dedupedAttendees.length < attendeesFiltered.length) {
      console.info(`[planner] deduped attendees: ${attendeesFiltered.length} → ${dedupedAttendees.length}`);
    }

    emit({ type: 'stage', stage: '02_ATTENDEES_RESOLVED', status: 'running', message: `${dedupedAttendees.length} attendees resolved` });
    // Emit each attendee identity immediately (fast first result)
    for (const a of dedupedAttendees) {
      emit({ type: 'attendee', attendeeId: (a as any)._id || a.name, status: 'resolving', data: { name: a.name, role: a.role, company: a.company, github: (a as any).github } });
    }
    emit({ type: 'stage', stage: '02_ATTENDEES_RESOLVED', status: 'done' });

    const meetingInput: MeetingInput = {
      title: meeting.title,
      description: meeting.description || undefined,
      agenda: meeting.agenda || undefined,
      dateTime: meeting.dateTime.toISOString(),
      duration: meeting.duration || undefined,
      location: meeting.location || undefined,
      meetingUrl: meeting.meetingUrl || undefined,
      attendees: dedupedAttendees.map(a => ({
        name: a.name,
        email: a.email || undefined,
        role: a.role || undefined,
        company: a.company || undefined,
        linkedin: a.linkedin || undefined,
        twitter: a.twitter || undefined,
        notes: a.notes || undefined,
        github: a.github || undefined,
        githubUsername: a.githubUsername || undefined,
      })),
    };

    onProgress?.({ stage: 'extracting', message: 'Extracting meeting topics...', progress: 10 });

    bench.start('llm:extractTopics');
    console.time('llm:extractTopics');
    let topics: string[] = [];
    try {
      // No caching for topic extraction (fast), but it is LLM call
      topics = await extractMeetingTopics(meeting.agenda || '', meeting.description || '');
      // Enforce budget: max 10 topics already, but dedupe again
      topics = Array.from(new Set(topics.map(t => t.trim()).filter(Boolean))).slice(0, 10);
    } catch (e) {
      console.warn('Topic extraction failed, continuing with empty topics:', e);
      topics = [];
    }
    bench.end('llm:extractTopics');
    try { console.timeEnd('llm:extractTopics'); } catch {}
    
    onProgress?.({ stage: 'attendees', message: 'Researching attendees...', progress: 25 });

    const attendeeProfiles = new Map<string, NonNullable<Awaited<ReturnType<typeof synthesizeAttendeeProfile>>>>();
    const allSources: Source[] = [];

    // Partial-failure tracking for attendees
    let attendeeSuccess = 0;
    let attendeeFailed = 0;
    const totalAttendees = meetingInput.attendees.length;
    const attendeeRecordsByName = new Map<string, typeof meeting.attendees[number]>();
    for (const r of meeting.attendees) {
      // deduped map: last attendee with same name wins — aligns with planner dedupe
      attendeeRecordsByName.set(r.name, r);
    }

    // Smart planner log: show which attendees have strong provided signals (linkedin/github/role/company) — may skip Tavily via cache
    for (const a of meetingInput.attendees) {
      const hasStrongSignal = !!(a.linkedin || a.github || a.githubUsername || (a.role && a.company));
      if (hasStrongSignal) {
        console.info(`[planner] attendee ${a.name} has strong provided signal (linkedin/github/role+company) — will check cache before Tavily`);
      }
      if (refresh) console.info(`[planner] refresh bypass for ${a.name}`);
    }

    // Parallelize: bounded parallel (Promise.all with concurrency 3) via semaphore
    // Measure before/after: sequential would be N * (tavily 3 queries + LLM), parallel 3 reduces to ceil(N/3)
    bench.start('tavily+llm:attendees');
    console.time('tavily+llm:attendees');
    const attendeeLimiter = createLimiter(3);

    // Deduplicate attendee names for LLM cache effectiveness: already deduped, but ensure map key uniqueness
    const uniqueAttendeeNames = new Set<string>();
    const attendeesToProcess = meetingInput.attendees.filter(a => {
      const k = a.name.toLowerCase();
      if (uniqueAttendeeNames.has(k)) return false;
      uniqueAttendeeNames.add(k);
      return true;
    });

    await Promise.all(
      attendeesToProcess.map((attendee, i) =>
        attendeeLimiter.run(async () => {
          // Progress per attendee (approximate)
          onProgress?.({ 
            stage: 'attendees', 
            message: `Researching ${attendee.name}...`, 
            progress: 25 + (i / Math.max(1, attendeesToProcess.length)) * 25 
          });

          try {
            // Budget check before attendee
            if (budgetRemaining() <= 0) {
              console.warn(`[budget] skipping attendee ${attendee.name} — budget exhausted`);
              attendeeFailed++;
              return;
            }
            // Smart planner: check cache before external call is done inside searchPerson (tavily:search:hash 24h)
            // Also uses provided fields: name+company directly for cache key
            const personResults = await searchPerson(attendee.name, attendee.company, { refresh });

            // Defense-in-depth: re-enforce 5k total context before LLM (research already does)
            const boundedResults = enforceTotalContextLimit(personResults, TAVILY_TOTAL_CONTEXT_MAX_CHARS);

            // LLM capping + caching: if cache hit for attendee, skip LLM (short-circuit)
            const profile = await cachedSynthesizeAttendeeProfile(attendee.name, attendee.company, boundedResults, refresh);
            
            if (profile) {
              const aId = attendeeRecordsByName.get(attendee.name)?.id || attendee.name;
              emit({ type: 'attendee', attendeeId: aId, status: profile ? 'ready' : 'error', data: { name: attendee.name, profile } });
              if (profile.sources?.length) emit({ type: 'evidence', attendeeId: aId, data: profile.sources.slice(0,3) });
              attendeeProfiles.set(attendee.name, profile);
              allSources.push(...profile.sources);
              attendeeSuccess++;
              
              const attendeeRecord = attendeeRecordsByName.get(attendee.name);
              if (attendeeRecord) {
                bench.start(`db:upsertAttendee:${attendee.name.slice(0, 20)}`);
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
                bench.end(`db:upsertAttendee:${attendee.name.slice(0, 20)}`);
              }
            } else {
              const aId2 = attendeeRecordsByName.get(attendee.name)?.id || attendee.name;
              emit({ type: 'attendee', attendeeId: aId2, status: 'error', message: 'No profile' });
              // Synthesize returned null — treat as partial failure (no data), not fatal
              attendeeFailed++;
              console.warn(`No profile synthesized for ${attendee.name} (empty or LLM failure)`);
            }
          } catch (e) {
            attendeeFailed++;
            console.warn(`Research failed for attendee ${attendee.name}, continuing:`, e);
            // Continue to next attendee — partial failure support
          }
        })
      )
    );
    bench.end('tavily+llm:attendees');
    try { console.timeEnd('tavily+llm:attendees'); } catch {}

    if (totalAttendees > 0) {
      const msg =
        attendeeFailed > 0
          ? `Research completed for ${attendeeSuccess}/${totalAttendees} attendees${attendeeFailed ? ` (${attendeeFailed} failed)` : ''}`
          : `Research completed for ${attendeeSuccess}/${totalAttendees} attendees`;
      console.info(msg);
      onProgress?.({ stage: 'attendees', message: msg, progress: 50 });
    }

    onProgress?.({ stage: 'companies', message: 'Researching companies...', progress: 50 });

    // Companies + Topics parallelization: companies alongside topics where independent (same level)
    const uniqueCompanies = Array.from(new Set(meetingInput.attendees.map(a => a.company).filter(Boolean) as string[]));
    // Smart planner: dedupe already done, but log
    if (uniqueCompanies.length) console.info(`[planner] unique companies: ${uniqueCompanies.join(', ')}`);
    const companyResearch: NonNullable<Awaited<ReturnType<typeof synthesizeCompanyResearch>>>[] = [];

    let companySuccess = 0;
    let companyFailed = 0;

    bench.start('tavily+llm:companies+topics');
    console.time('tavily+llm:companies+topics');

    // Bounded parallel for companies (concurrency 3)
    const companyLimiter = createLimiter(3);
    const companyTask = (async () => {
      if (uniqueCompanies.length === 0) return;
      await Promise.all(
        uniqueCompanies.map((company, i) =>
          companyLimiter.run(async () => {
            onProgress?.({ 
              stage: 'companies', 
              message: `Researching ${company}...`, 
              progress: 50 + (i / Math.max(1, uniqueCompanies.length)) * 20 
            });

            try {
              if (budgetRemaining() <= 0) {
                console.warn(`[budget] skipping company ${company} — budget exhausted`);
                companyFailed++;
                return;
              }
              // Caching: tavily:search:company 24h via research.ts; LLM also cached (company:research 24h)
              const companyResults = await searchCompany(company, { refresh });
              const bounded = enforceTotalContextLimit(companyResults, TAVILY_TOTAL_CONTEXT_MAX_CHARS);
              // Short-circuit: if cache hit for company, skip LLM (cachedSynthesize does this)
              const research = await cachedSynthesizeCompanyResearch(company, bounded, refresh);
              
              if (research) {
                emit({ type: 'evidence', company: company, data: research.sources?.slice(0,2) });
                companyResearch.push(research);
                allSources.push(...research.sources);
                companySuccess++;

                bench.start(`db:company:${company.slice(0, 20)}`);
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
                bench.end(`db:company:${company.slice(0, 20)}`);
              } else {
                companyFailed++;
                console.warn(`No research synthesized for company ${company}`);
              }
            } catch (e) {
              companyFailed++;
              console.warn(`Research failed for company ${company}, continuing:`, e);
            }
          })
        )
      );
      if (uniqueCompanies.length > 0 && companyFailed > 0) {
        const msg = `Research completed for ${companySuccess}/${uniqueCompanies.length} companies (${companyFailed} failed)`;
        console.info(msg);
        onProgress?.({ stage: 'companies', message: msg, progress: 70 });
      }
    })();

    // Topics parallel to companies where independent (do not depend on company results)
    const topicBriefs: NonNullable<Awaited<ReturnType<typeof synthesizeTopicBriefs>>> = [];
    const topicTask = (async () => {
      onProgress?.({ stage: 'topics', message: 'Researching topics...', progress: 70 });
      if (topics.length > 0) {
        try {
          bench.start('tavily:topics');
          // searchTopic: 1 query per topic, max 10 results, 5k context budget, cached tavily:search:topic 24h
          if (budgetRemaining() <= 0) {
            console.warn('[budget] skipping topics — budget exhausted');
            bench.end('tavily:topics');
            return;
          }
          const topicResults = await searchTopic(topics.join(' '), meeting.description || '', { refresh });
          bench.end('tavily:topics');
          const boundedTopic = enforceTotalContextLimit(topicResults, TAVILY_TOTAL_CONTEXT_MAX_CHARS);
          bench.start('llm:topics');
          // Short-circuit: if cache hit for topic, skip LLM (company:topic 24h)
          const briefs = await cachedSynthesizeTopicBriefs(topics, meeting.description || '', boundedTopic, refresh);
          bench.end('llm:topics');
          
          for (const brief of briefs) {
            allSources.push(...brief.sources);
          }
          topicBriefs.push(...briefs);
        } catch (e) {
          try { bench.end('tavily:topics'); } catch {}
          try { bench.end('llm:topics'); } catch {}
          console.warn('Topic research failed, continuing without topics:', e);
          // Partial failure: topics are supplementary, pipeline continues
        }
      }
    })();

    // Run companies and topics concurrently (independent)
    await Promise.all([companyTask, topicTask]);
    bench.end('tavily+llm:companies+topics');
    try { console.timeEnd('tavily+llm:companies+topics'); } catch {}

    emit({ type: 'stage', stage: '06_BRIEF_GENERATING', status: 'running', message: 'Synthesizing brief' });
    onProgress?.({ stage: 'synthesizing', message: 'Generating meeting brief...', progress: 85 });

    bench.start('llm:brief');
    console.time('llm:brief');
    // LLM budget: batch brief generation includes all contexts in one call (already) — 5k cap enforced via truncation in llm.ts
    // Document reduction: before: 1 per attendee + 1 per company + 1 for topics + 1 for brief = 4-10 calls; after: cached company/topic hits skip LLM, attendees parallel but still 1 per attendee, brief remains 1 — effective reduction on cache hits (second run: 1 brief + 0 cached = 1 vs 4-10)
    // For fresh run without cache: same count but parallelized; for cached re-run: ~1 LLM call (brief only) vs 4-10 = 75-90% reduction.
    const brief = await generateMeetingBrief(
      meetingInput,
      attendeeProfiles,
      companyResearch,
      topicBriefs,
      allSources
    );
    bench.end('llm:brief');
    try { console.timeEnd('llm:brief'); } catch {}

    if (brief) {
      if (brief) {
      emit({ type: 'brief_section', section: 'tldr', data: brief.tldr });
      emit({ type: 'brief_section', section: 'attendees', data: brief.attendeeSummaries });
      emit({ type: 'brief_section', section: 'brief', data: brief });
      emit({ type: 'brief', data: brief });
    }
    bench.start('db:brief');
      console.time('db:brief');
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
      bench.end('db:brief');
      try { console.timeEnd('db:brief'); } catch {}
    }

    bench.start('db:complete');
    console.time('db:complete');
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'COMPLETED' },
    });
    bench.end('db:complete');
    try { console.timeEnd('db:complete'); } catch {}

    // Final partial-failure-aware summary
    let completeMsg = 'Research complete!';
    if (totalAttendees > 0 && attendeeFailed > 0) {
      completeMsg = `Research completed for ${attendeeSuccess}/${totalAttendees} attendees`;
      if (uniqueCompanies.length > 0) completeMsg += `, ${companySuccess}/${uniqueCompanies.length} companies`;
      if (attendeeFailed > 0 || companyFailed > 0) completeMsg += ' — partial results, some queries failed';
    }
    emit({ type: 'stage', stage: '07_COMPLETE', status: 'done', message: completeMsg });
    emit({ type: 'complete', data: { message: completeMsg } });
    onProgress?.({ stage: 'complete', message: completeMsg, progress: 100 });

    bench.start('notifications');
    // Notification: research complete — still fires even on partial failure
    await createNotification({
      type: 'research_complete',
      title: 'Research complete',
      message: `"${meetingTitle.slice(0, 80)}" is ready — ${attendeeSuccess}/${totalAttendees} attendees, ${companySuccess}/${uniqueCompanies.length} companies researched.`,
      meetingId,
    }).catch(() => {});
    bench.end('notifications');

    bench.end('pipeline:total');
    try { console.timeEnd('pipeline:total'); } catch {}
    const summary = bench.summary();
    console.info('[benchmark] pipeline complete — durations (ms):', JSON.stringify(summary));
    console.info(`[benchmark] budget used: tavilyQueries=${globalBudget.getTavilyCount()}/${BUDGET.MAX_TOTAL_TAVILY_QUERIES}, circuit=${JSON.stringify(tavilyCircuitBreaker.getState())}`);
    console.info('[benchmark] LLM call reduction: before 4-10 calls (1 per attendee + 1 per company + 1 topics + 1 brief); after: parallel + cache short-circuit — cached re-run ≈1 LLM (brief only), fresh run parallelized (same count but 3x faster wall time)');

    return { success: true };
  } catch (error) {
    console.error('Research pipeline error:', error);
    
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'DRAFT' },
    }).catch(() => {});

    emit({ type: 'stage', stage: 'error', status: 'error', message: error instanceof Error ? error.message : 'Research failed' });
    emit({ type: 'error', message: error instanceof Error ? error.message : 'Research failed' });
    onProgress?.({ 
      stage: 'error', 
      message: error instanceof Error ? error.message : 'Research failed', 
      progress: 0 
    });

    // Notification: research failed — still fires on error
    await createNotification({
      type: 'research_failed',
      title: 'Research failed',
      message: `Research for "${meetingTitle.slice(0, 80)}" failed: ${(error instanceof Error ? error.message : 'Unknown error').slice(0, 200)}`,
      meetingId,
    }).catch(() => {});

    try { bench.end('pipeline:total'); } catch {}
    try { console.timeEnd('pipeline:total'); } catch {}

    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getMeetingBrief(meetingId: string) {
  console.time('db:getMeetingBrief');
  const res = await prisma.brief.findUnique({ where: { meetingId } });
  try { console.timeEnd('db:getMeetingBrief'); } catch {}
  return res;
}

export async function getMeetingWithResearch(meetingId: string) {
  console.time('db:getMeetingWithResearch');
  const res = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      attendees: { include: { profile: true } },
      research: true,
      brief: true,
    },
  });
  try { console.timeEnd('db:getMeetingWithResearch'); } catch {}
  return res;
}

/**
 * LLM Call Reduction Documentation
 * ---------------------------------
 * Before: 1 LLM per attendee (N) + 1 per company (C) + 1 for topics + 1 for brief = N+C+2 (4-10 for typical 2-4 attendees, 1-2 companies)
 * After:
 *   - Attendee synthesis still 1 per unique attendee (N) but cached via llm:attendee:hash 24h → second run 0
 *   - Company synthesis 1 per company (C) but cached via company:research:hash 24h → if cache hit, skip LLM
 *   - Topic synthesis 1 but cached via company:topic:hash 24h → if cache hit, skip LLM
 *   - Brief remains 1 (batch includes all contexts) — already optimal
 *   Effective reduction:
 *     Fresh (no cache): N+C+2 calls, but wall time parallelized (attendees concurrency 3, companies+topics concurrent)
 *     Cached (repeat meeting or same company/person): 1 call (brief only) → 75-90% reduction
 */
