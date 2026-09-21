export interface MeetingInput {
  title: string;
  description?: string;
  agenda?: string;
  dateTime: string;
  duration?: number;
  location?: string;
  meetingUrl?: string;
  attendees: AttendeeInput[];
  additionalContext?: string;
  host?: { name: string; email?: string };
}

export interface AttendeeInput {
  name: string;
  email?: string;
  role?: string;
  company?: string;
  linkedin?: string;
  twitter?: string;
  notes?: string;
  github?: string;
  githubUsername?: string;
}

export interface AttendeeProfile {
  currentRole?: string;
  currentCompany?: string;
  previousRoles?: Array<{ role: string; company: string; duration: string }>;
  expertise: string[];
  notableProjects?: Array<{ name: string; description: string; link?: string }>;
  interests: string[];
  bio?: string;
  avatarUrl?: string;
  sources: Source[];
}

export interface CompanyResearch {
  summary: string;
  recentNews?: Array<{ title: string; url: string; date: string; summary: string }>;
  products?: Array<{ name: string; description: string; url?: string }>;
  keyPeople?: Array<{ name: string; role: string; profileUrl?: string }>;
  insights?: string;
  sources: Source[];
}

export interface TopicBrief {
  topic: string;
  context: string;
  recentDevelopments: string;
  whyItMatters: string;
  discussionAngle: string;
  sources: Source[];
}

export interface TalkingPoints {
  highPriority: string[];
  opportunity: string[];
  questions: string[];
  followUp: string[];
}

export interface ConversationStarter {
  text: string;
  context: string;
  attendee?: string;
}

export interface Source {
  title: string;
  url: string;
  type: 'official' | 'news' | 'professional' | 'social' | 'other';
  credibility: 'high' | 'medium' | 'low';
  date?: string;
}

export interface Evidence {
  fact: string;
  sourceUrl: string;
  sourceType: string;
  confidence: 'high' | 'medium' | 'low';
  date?: string;
}

export interface ResolvedIdentity {
  name: string;
  role?: string;
  company?: string;
  linkedinUrl?: string;
  githubUsername?: string;
  githubSnapshot?: any;
  confidence: 'HIGH'|'MEDIUM'|'LOW'|'UNRESOLVED';
  evidence: Evidence[];
  summary?: string;
  location?: string;
  needsMoreInfo?: boolean;
  lastResearched?: string;
}

export interface MeetingBrief {
  id: string;
  meetingId: string;
  tldr: string[];
  attendeeSummaries: AttendeeSummary[];
  companyContext?: CompanyResearch[];
  topicBriefs?: TopicBrief[];
  talkingPoints: TalkingPoints;
  conversationStarters: ConversationStarter[];
  questions: string[];
  watchOuts?: string[];
  sources: Source[];
  generatedAt: string;
  commonGround?: string[];
  meetingIntelligence?: {
    host: string;
    whyAttendeesMatter: Record<string,string>;
    recentSignals: string[];
  }
}

export interface AttendeeSummary {
  name: string;
  role: string;
  company: string;
  relevantBackground: string;
  whyTheyMatter: string;
  confidence: 'verified' | 'inferred' | 'potential';
  sources: Source[];
  github?: string;
  evidence?: Evidence[];
  linkedinVerified?: boolean;
}

export interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  credibility: 'high' | 'medium' | 'low';
  relevance: number;
}

export type MeetingStatus = 'DRAFT' | 'RESEARCHING' | 'COMPLETED' | 'ARCHIVED';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}