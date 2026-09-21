import { MeetingInput, AttendeeInput, AttendeeProfile, CompanyResearch, TopicBrief, MeetingBrief, Source } from '@/types'

describe('Type Definitions', () => {
  it('MeetingInput accepts valid data', () => {
    const meeting: MeetingInput = {
      title: 'Test Meeting',
      dateTime: '2024-01-15T10:00:00Z',
      attendees: [
        { name: 'Jane Doe', email: 'jane@test.com', role: 'VP', company: 'Acme' }
      ]
    }
    expect(meeting.title).toBe('Test Meeting')
    expect(meeting.attendees).toHaveLength(1)
  })

  it('AttendeeInput accepts all fields', () => {
    const attendee: AttendeeInput = {
      name: 'John Smith',
      email: 'john@test.com',
      role: 'CTO',
      company: 'TechCorp',
      linkedin: 'linkedin.com/in/john',
      twitter: '@john',
      notes: 'Important decision maker'
    }
    expect(attendee.linkedin).toContain('linkedin')
  })

  it('AttendeeProfile includes all research fields', () => {
    const profile: AttendeeProfile = {
      currentRole: 'VP Engineering',
      currentCompany: 'Acme AI',
      previousRoles: [{ role: 'Senior Engineer', company: 'Google', duration: '3 years' }],
      expertise: ['AI', 'ML', 'Distributed Systems'],
      notableProjects: [{ name: 'Project X', description: 'AI platform', link: 'https://example.com' }],
      interests: ['Open Source', 'Mentoring'],
      bio: 'Experienced engineering leader',
      avatarUrl: 'https://example.com/avatar.jpg',
      sources: [
        { title: 'LinkedIn', url: 'https://linkedin.com/in/jane', type: 'professional', credibility: 'high' }
      ]
    }
    expect(profile.expertise).toContain('AI')
    expect(profile.sources[0].credibility).toBe('high')
  })

  it('CompanyResearch includes all fields', () => {
    const research: CompanyResearch = {
      summary: 'AI company focused on LLMs',
      recentNews: [{ title: 'Funding', url: 'https://news.com', date: '2024-01-01', summary: 'Raised $10M' }],
      products: [{ name: 'ModelX', description: 'LLM platform', url: 'https://product.com' }],
      keyPeople: [{ name: 'Jane Doe', role: 'CEO', profileUrl: 'https://linkedin.com' }],
      insights: 'Rapidly growing',
      sources: [{ title: 'Crunchbase', url: 'https://crunchbase.com', type: 'official', credibility: 'high' }]
    }
    expect(research.recentNews).toHaveLength(1)
  })

  it('MeetingBrief has all required sections', () => {
    const brief: MeetingBrief = {
      id: '1',
      meetingId: 'm1',
      tldr: ['Key point 1', 'Key point 2'],
      attendeeSummaries: [
        { name: 'Jane', role: 'VP', company: 'Acme', relevantBackground: 'AI expert', whyTheyMatter: 'Decision maker', confidence: 'verified', sources: [] }
      ],
      companyContext: [],
      topicBriefs: [],
      talkingPoints: {
        highPriority: ['Priority 1'],
        opportunity: ['Opportunity 1'],
        questions: ['Question 1'],
        followUp: ['Follow up 1']
      },
      conversationStarters: [{ text: 'Starter 1', context: 'Context 1' }],
      questions: ['Question 1'],
      watchOuts: ['Watch out 1'],
      sources: [],
      generatedAt: new Date().toISOString()
    }
    expect(brief.tldr).toHaveLength(2)
    expect(brief.talkingPoints.highPriority).toHaveLength(1)
  })

  it('Source credibility levels', () => {
    const sources: Source[] = [
      { title: 'Official', url: 'https://official.com', type: 'official', credibility: 'high' },
      { title: 'News', url: 'https://news.com', type: 'news', credibility: 'medium' },
      { title: 'Social', url: 'https://social.com', type: 'social', credibility: 'low' }
    ]
    expect(sources[0].credibility).toBe('high')
    expect(sources[2].credibility).toBe('low')
  })
})