import type { MeetingInput } from '@/types';

/**
 * Deterministic meeting scenarios for BeforeCall.
 * All data is fictional — no real private individuals.
 * Categories cover happy paths, edge inputs, and failure simulations.
 *
 * Each scenario expresses expected brief shape minima; tests validate
 * that input passes Zod, mock research + mock LLM produce valid brief.
 */

export type ScenarioResearchMode = 'success' | 'empty' | 'rate_limit' | 'timeout' | 'partial';
export type ScenarioLlmMode = 'success' | 'malformed' | 'timeout';

export interface ScenarioExpected {
  briefShouldHave: {
    tldrMin: number;
    attendeesMin: number;
    startersMin: number;
    questionsMin: number;
    sourcesMin: number;
  };
  researchMode?: ScenarioResearchMode;
  llmMode?: ScenarioLlmMode;
  shouldFail?: string; // descriptive, but scenario still produces degraded brief (never hard-fails)
  description?: string;
}

export interface Scenario {
  id: string;
  name: string;
  category: string; // functional bucket for reporting
  input: MeetingInput;
  expected: ScenarioExpected;
}

// Helper to produce ISO date 7 days from now
function futureDate(daysOffset = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

// Long agenda stress (approx 4700 chars, within 5000 limit — Zod max 5000)
const longAgenda = Array.from({ length: 22 }, (_, i) =>
  `${i + 1}. Discuss Q${((i % 4) + 1)} strategic pillar review: metrics, ownership, dependencies, risks, mitigation, next steps, and decision log. Action items from prior session to be reconciled against OKRs and budget forecast for FY26.`
).join('\n');

export const scenarios: Scenario[] = [
  // 1 Standard sales (2 attendees, company)
  {
    id: '01-standard-sales',
    name: 'Standard Sales — Nimbus Labs',
    category: 'sales',
    input: {
      title: 'Intro Call — Nimbus Labs x NorthPeak Software',
      description: 'Introductory sales discussion to explore workflow automation needs and demo NorthPeak platform.',
      agenda: '1. Intros\n2. Nimbus current workflow pain points\n3. NorthPeak demo (15 min)\n4. Pricing and timeline\n5. Next steps',
      dateTime: futureDate(7),
      duration: 45,
      location: 'Google Meet',
      meetingUrl: 'https://meet.example.com/nimbus-intro',
      attendees: [
        { name: 'Alex Rivera', role: 'VP Operations', company: 'Nimbus Labs', email: 'alex.rivera@nimbuslabs.example' },
        { name: 'Priya Desai', role: 'Head of Procurement', company: 'Nimbus Labs', email: 'priya@nimbuslabs.example' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 3, attendeesMin: 2, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 2 Investor (founder+investor)
  {
    id: '02-investor',
    name: 'Investor — Founder + Partner at Meridian Ventures',
    category: 'investor',
    input: {
      title: 'Seed Follow-up — AstraSync & Meridian Ventures',
      description: 'Follow-up after seed pitch, discuss traction and bridge round terms.',
      agenda: 'Traction update (MRR, churn), product roadmap, bridge terms, diligence next steps',
      dateTime: futureDate(8),
      duration: 30,
      attendees: [
        { name: 'Jordan Lee', role: 'Founder & CEO', company: 'AstraSync', email: 'jordan@astrasync.example' },
        { name: 'Morgan Blake', role: 'Partner', company: 'Meridian Ventures', email: 'morgan@meridianvc.example' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 3, attendeesMin: 2, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 3 Technical partnership (eng heavy)
  {
    id: '03-technical-partnership',
    name: 'Technical Partnership — Cortex Systems',
    category: 'partnership',
    input: {
      title: 'Technical Partnership — API Integration: Cortex Systems',
      description: 'Evaluate joint integration between Cortex inference platform and NorthPeak orchestration layer.',
      agenda: 'Architecture overview, auth & rate limits, data residency, latency SLOs, joint roadmap',
      dateTime: futureDate(9),
      duration: 60,
      attendees: [
        { name: 'Samir Patel', role: 'Staff Engineer, Platform', company: 'Cortex Systems' },
        { name: 'Elena Kovacs', role: 'Principal Architect', company: 'Cortex Systems' },
        { name: 'Devon Wu', role: 'Engineering Manager', company: 'NorthPeak Software' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 3, attendeesMin: 3, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 4 Job interview (candidate+interviewer)
  {
    id: '04-job-interview',
    name: 'Job Interview — Senior PM Candidate',
    category: 'interview',
    input: {
      title: 'Interview — Senior Product Manager: Maya Chen',
      description: 'Final round interview for Senior PM role.',
      agenda: 'Case study debrief, product sense, leadership & collaboration, Q&A',
      dateTime: futureDate(5),
      duration: 60,
      attendees: [
        { name: 'Maya Chen', role: 'Product Manager', company: 'Veridian Dynamics', email: 'maya.chen@example.com' },
        { name: 'Rahul Singh', role: 'Hiring Manager, Product', company: 'NorthPeak Software', notes: 'Panel interviewer' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 3, attendeesMin: 2, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 5 Customer discovery (multiple)
  {
    id: '05-customer-discovery',
    name: 'Customer Discovery — Fintech Cohort',
    category: 'discovery',
    input: {
      title: 'Customer Discovery — Fintech Ops Leaders',
      description: 'Discovery interviews with ops leaders at mid-market fintechs to validate onboarding friction hypotheses.',
      agenda: 'Current onboarding workflow, tools, pain points, willingness to pilot, pricing sensitivity',
      dateTime: futureDate(6),
      duration: 45,
      attendees: [
        { name: 'Tina Okafor', role: 'Ops Lead', company: 'PayHarbor', email: 'tina@payharbor.example' },
        { name: 'Luis Fernandez', role: 'COO', company: 'Ledgerline', email: 'luis@ledgerline.example' },
        { name: 'Aisha Khan', role: 'Head of Compliance', company: 'Vaulttide', email: 'aisha@vaulttide.example' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 3, attendeesMin: 3, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 6 Enterprise procurement
  {
    id: '06-enterprise-procurement',
    name: 'Enterprise Procurement — Helios Global',
    category: 'enterprise',
    input: {
      title: 'Procurement Review — Helios Global Enterprise License',
      description: 'Enterprise procurement review for 500-seat license, security and legal review.',
      agenda: 'Security questionnaire, DPA/MSA redlines, SSO/SAML requirements, rollout plan, commercials',
      dateTime: futureDate(10),
      duration: 60,
      attendees: [
        { name: 'Karen Holt', role: 'Director of Procurement', company: 'Helios Global' },
        { name: 'James Park', role: 'InfoSec Lead', company: 'Helios Global' },
        { name: 'Nadia Yusuf', role: 'Legal Counsel', company: 'Helios Global' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 3, attendeesMin: 3, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 7 Startup founder
  {
    id: '07-startup-founder',
    name: 'Startup Founder — Solo Founder Intro',
    category: 'founder',
    input: {
      title: 'Coffee — Startup Founder: Felix Ortega / Brightloop',
      description: 'Informal intro with solo founder building AI-driven scheduling.',
      agenda: 'Origin story, product demo, go-to-market, potential collaboration',
      dateTime: futureDate(4),
      duration: 30,
      location: 'Blue Bottle — Market St',
      attendees: [
        { name: 'Felix Ortega', role: 'Founder', company: 'Brightloop' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 2, attendeesMin: 1, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 8 Product demo
  {
    id: '08-product-demo',
    name: 'Product Demo — Internal Demo to Prospect',
    category: 'demo',
    input: {
      title: 'Product Demo — Quartile Health',
      description: 'Tailored demo of NorthPeak care-ops platform for Quartile Health.',
      agenda: 'Demo: intake automation, EHR sync, analytics; Q&A; implementation timeline',
      dateTime: futureDate(7),
      duration: 45,
      attendees: [
        { name: 'Dr. Simone Reed', role: 'CMO', company: 'Quartile Health' },
        { name: 'Hassan El-Amin', role: 'VP Digital Health', company: 'Quartile Health' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 3, attendeesMin: 2, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 9 AI research
  {
    id: '09-ai-research',
    name: 'AI Research — Model Evaluation Sync',
    category: 'research',
    input: {
      title: 'AI Research Sync — LLM Evaluation Benchmarks',
      description: 'Share recent evals on retrieval-augmented reasoning and discuss benchmark methodology.',
      agenda: 'Benchmark results (HELM, MMLU subset), retrieval ablations, error analysis, next experiments',
      dateTime: futureDate(3),
      duration: 60,
      attendees: [
        { name: 'Dr. Kenji Tanaka', role: 'Research Scientist', company: 'AstraSync Research' },
        { name: 'Lena Fischer', role: 'ML Engineer', company: 'NorthPeak AI' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 3, attendeesMin: 2, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 10 Hardware
  {
    id: '10-hardware',
    name: 'Hardware — Sensor Supply Chain',
    category: 'hardware',
    input: {
      title: 'Hardware Sync — LumenSense Sensor Supply',
      description: 'Discuss sensor supply constraints and alternative sourcing for LumenSense edge unit.',
      agenda: 'Lead times, BOM cost deltas, qualification testing, dual-sourcing options',
      dateTime: futureDate(6),
      duration: 45,
      attendees: [
        { name: 'Marco Silva', role: 'Supply Chain Manager', company: 'LumenSense' },
        { name: 'Anika Roy', role: 'Hardware PM', company: 'NorthPeak Hardware' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 3, attendeesMin: 2, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 11 Marketing
  {
    id: '11-marketing',
    name: 'Marketing — Co-marketing Campaign',
    category: 'marketing',
    input: {
      title: 'Co-marketing — Nimbus Labs Launch Campaign',
      description: 'Plan joint GTM campaign for Nimbus + NorthPeak integration launch.',
      agenda: 'Messaging, assets, webinar, press, timeline, ownership',
      dateTime: futureDate(8),
      duration: 30,
      attendees: [
        { name: 'Sophie Laurent', role: 'Head of Marketing', company: 'Nimbus Labs' },
        { name: 'Omar Haddad', role: 'Growth Lead', company: 'NorthPeak Software' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 3, attendeesMin: 2, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 12 No company provided
  {
    id: '12-no-company',
    name: 'Edge — No Company Provided',
    category: 'edge',
    input: {
      title: 'Advisory Chat — No Company Context',
      description: 'Exploratory advisory conversation with independent operators.',
      agenda: 'Career advice, market trends, intro to community',
      dateTime: futureDate(5),
      attendees: [
        { name: 'Riley Quinn', role: 'Independent Advisor', email: 'riley.quinn@example.com' },
        { name: 'Casey Morgan', role: 'Operator', email: 'casey.morgan@example.com' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 2, attendeesMin: 2, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 13 No agenda (sparse)
  {
    id: '13-no-agenda',
    name: 'Edge — No Agenda Sparse',
    category: 'edge',
    input: {
      title: 'Quick Sync — No Agenda',
      dateTime: futureDate(2),
      attendees: [
        { name: 'Taylor Brooks', role: 'Product Lead', company: 'NorthPeak Software' },
        { name: 'Jordan Avery', role: 'Design Lead', company: 'Nimbus Labs' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 2, attendeesMin: 2, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 14 One attendee (minimal)
  {
    id: '14-one-attendee',
    name: 'Edge — One Attendee Minimal',
    category: 'edge',
    input: {
      title: '1:1 — Minimal Info',
      dateTime: futureDate(3),
      attendees: [
        { name: 'Alex Kim' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 2, attendeesMin: 1, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 15 Many attendees (6-10)
  {
    id: '15-many-attendees',
    name: 'Edge — Many Attendees (8)',
    category: 'edge',
    input: {
      title: 'Steering Committee — Q3 Planning (8 attendees)',
      description: 'Quarterly steering committee with cross-functional leads.',
      agenda: 'Q2 retro, Q3 OKRs, staffing, budget, risk register',
      dateTime: futureDate(10),
      duration: 90,
      attendees: [
        { name: 'Patel Raj', role: 'VP Product', company: 'NorthPeak Software' },
        { name: 'Morgan Lee', role: 'VP Engineering', company: 'NorthPeak Software' },
        { name: 'Kim Joon', role: 'Head of Design', company: 'NorthPeak Software' },
        { name: 'Sofia Alvarez', role: 'CFO', company: 'NorthPeak Software' },
        { name: 'David Okafor', role: 'Head of Sales', company: 'NorthPeak Software' },
        { name: 'Emily Zhang', role: 'Head of Customer Success', company: 'NorthPeak Software' },
        { name: 'Chris Nolan', role: 'Advisor', company: 'Meridian Ventures' },
        { name: 'Ruth Becker', role: 'Board Observer', company: 'Helios Global' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 3, attendeesMin: 8, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 16 Duplicate attendee names (same name twice)
  {
    id: '16-duplicate-names',
    name: 'Edge — Duplicate Attendee Names',
    category: 'edge',
    input: {
      title: 'Workshop — Duplicate Names Edge',
      description: 'Workshop where attendee list contains same name twice (data entry duplication).',
      agenda: 'Workshop facilitation, roles clarification',
      dateTime: futureDate(5),
      attendees: [
        { name: 'Alex Rivera', role: 'VP Operations', company: 'Nimbus Labs', email: 'alex.rivera@nimbuslabs.example' },
        { name: 'Alex Rivera', role: 'VP Operations', company: 'Nimbus Labs', email: 'alex.rivera+duplicate@nimbuslabs.example' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 2, attendeesMin: 1, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 17 Missing professional info
  {
    id: '17-missing-info',
    name: 'Edge — Missing Professional Info',
    category: 'edge',
    input: {
      title: 'Community Meet — Missing Info',
      description: 'Community introductions with minimal profile data.',
      agenda: 'Round-robin intros, community goals',
      dateTime: futureDate(4),
      attendees: [
        { name: 'Sam Taylor' },
        { name: 'Jordan Smith' },
        { name: 'Casey Lee' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 2, attendeesMin: 3, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
    },
  },
  // 18 Tavily empty result
  {
    id: '18-tavily-empty',
    name: 'Failure — Tavily Empty Result',
    category: 'failure',
    input: {
      title: 'Stealth Startup — No Web Presence: Obscura Labs',
      description: 'Meeting with stealth startup with almost no public information.',
      agenda: 'Stealth product overview, hiring needs',
      dateTime: futureDate(7),
      attendees: [
        { name: 'Zara Obscura', role: 'Founder', company: 'Obscura Labs' },
        { name: 'Nico Vance', role: 'Co-founder', company: 'Obscura Labs' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 2, attendeesMin: 2, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'empty',
      llmMode: 'success',
      description: 'Research returns empty — brief must degrade gracefully with inference labels',
    },
  },
  // 19 Tavily rate limit 429
  {
    id: '19-tavily-429',
    name: 'Failure — Tavily Rate Limit 429',
    category: 'failure',
    input: {
      title: 'High-Volume Research — Rate Limit Test',
      description: 'Back-to-back research that would trigger rate limit if shared bucket exhausted.',
      agenda: 'Cross-company benchmarking, competitive landscape',
      dateTime: futureDate(7),
      duration: 60,
      attendees: [
        { name: 'Alex Rivera', role: 'VP Operations', company: 'Nimbus Labs' },
        { name: 'Priya Desai', role: 'Head of Procurement', company: 'Nimbus Labs' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 2, attendeesMin: 2, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'rate_limit',
      llmMode: 'success',
      description: '429 should be retried then degraded — brief still produced',
    },
  },
  // 20 Tavily timeout
  {
    id: '20-tavily-timeout',
    name: 'Failure — Tavily Timeout',
    category: 'failure',
    input: {
      title: 'Research Timeout — Slow Network Simulation',
      description: 'Meet where research provider times out (10s abort).',
      agenda: 'Partnership discussion that requires web research under degraded network',
      dateTime: futureDate(6),
      attendees: [
        { name: 'Elena Kovacs', role: 'Principal Architect', company: 'Cortex Systems' },
        { name: 'Devon Wu', role: 'Engineering Manager', company: 'NorthPeak Software' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 2, attendeesMin: 2, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'timeout',
      llmMode: 'success',
      description: 'Timeout returns empty results — pipeline continues',
    },
  },
  // 21 LLM malformed JSON
  {
    id: '21-llm-malformed',
    name: 'Failure — LLM Malformed JSON',
    category: 'failure',
    input: {
      title: 'LLM Malformed — Repair Path',
      description: 'Test LLM returning malformed JSON that needs repair parsing.',
      agenda: 'Product strategy review requiring synthesis',
      dateTime: futureDate(7),
      duration: 45,
      attendees: [
        { name: 'Maya Chen', role: 'Product Manager', company: 'Veridian Dynamics' },
        { name: 'Rahul Singh', role: 'Hiring Manager', company: 'NorthPeak Software' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 2, attendeesMin: 2, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'malformed',
      description: 'Malformed JSON should be caught, retried, then fallback brief still valid',
    },
  },
  // 22 LLM timeout
  {
    id: '22-llm-timeout',
    name: 'Failure — LLM Timeout',
    category: 'failure',
    input: {
      title: 'LLM Timeout — Ollama Unresponsive',
      description: 'Synthesis where LLM times out (model cold start).',
      agenda: 'Executive briefing that depends on LLM synthesis',
      dateTime: futureDate(7),
      duration: 45,
      attendees: [
        { name: 'Sofia Alvarez', role: 'CFO', company: 'NorthPeak Software' },
        { name: 'David Okafor', role: 'Head of Sales', company: 'NorthPeak Software' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 2, attendeesMin: 2, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'timeout',
      description: 'LLM timeout should be handled — degraded brief or fallback',
    },
  },
  // 23 Partial research failure (one branch fails)
  {
    id: '23-partial-failure',
    name: 'Failure — Partial Research (one branch fails)',
    category: 'failure',
    input: {
      title: 'Partial Failure — One Attendee Research Fails',
      description: 'Three attendees where one has unreliable data source.',
      agenda: 'Multi-stakeholder review requiring per-attendee isolation',
      dateTime: futureDate(8),
      duration: 60,
      attendees: [
        { name: 'Alex Rivera', role: 'VP Operations', company: 'Nimbus Labs' },
        { name: 'Zara Obscura', role: 'Founder', company: 'Obscura Labs' },
        { name: 'Priya Desai', role: 'Head of Procurement', company: 'Nimbus Labs' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 3, attendeesMin: 3, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'partial',
      llmMode: 'success',
      description: 'One attendee fails but others succeed — partial isolation',
    },
  },
  // 24 Extremely long agenda (stress)
  {
    id: '24-long-agenda',
    name: 'Stress — Extremely Long Agenda',
    category: 'stress',
    input: {
      title: 'Annual Planning — Stress Test Long Agenda',
      description: 'Annual planning session with exhaustive pre-read covering every initiative.',
      agenda: longAgenda,
      dateTime: futureDate(14),
      duration: 120,
      attendees: [
        { name: 'Patel Raj', role: 'VP Product', company: 'NorthPeak Software' },
        { name: 'Morgan Lee', role: 'VP Engineering', company: 'NorthPeak Software' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 3, attendeesMin: 2, startersMin: 3, questionsMin: 1, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
      description: 'Agenda near 5000 char limit — must be truncated safely',
    },
  },
  // 25 Full realistic production workflow
  {
    id: '25-full-production',
    name: 'Full Realistic Production Workflow',
    category: 'production',
    input: {
      title: 'Q3 Business Review — NorthPeak & Helios Global Partnership',
      description: 'Quarterly business review between NorthPeak Software and Helios Global covering integration milestones, expansion opportunities, and roadmap alignment for the enterprise platform rollout.',
      agenda: '1. Welcome & introductions (5 min)\n2. Q2 milestones recap — integration delivery, SSO launch, pilot metrics (15 min)\n3. Customer feedback & adoption data (10 min)\n4. Q3 roadmap — analytics module, data residency, pricing (15 min)\n5. Commercials — expansion to 500 additional seats, renewal terms (10 min)\n6. Risks & mitigations (5 min)\n7. Next steps & owners',
      dateTime: futureDate(12),
      duration: 60,
      location: 'Helios HQ, Conference A + Zoom',
      meetingUrl: 'https://helios.example.zoom.us/j/123456',
      additionalContext: 'Helios is evaluating expansion; procurement involved. Focus on security and data residency.',
      attendees: [
        { name: 'Karen Holt', role: 'Director of Procurement', company: 'Helios Global', email: 'karen.holt@helios.example', linkedin: 'linkedin.com/in/karenholt' },
        { name: 'James Park', role: 'InfoSec Lead', company: 'Helios Global', email: 'james.park@helios.example' },
        { name: 'Nadia Yusuf', role: 'Legal Counsel', company: 'Helios Global', email: 'nadia@helios.example' },
        { name: 'Priya Nair', role: 'VP Customer Success', company: 'NorthPeak Software', email: 'priya.nair@northpeak.example' },
      ],
    },
    expected: {
      briefShouldHave: { tldrMin: 3, attendeesMin: 4, startersMin: 5, questionsMin: 2, sourcesMin: 0 },
      researchMode: 'success',
      llmMode: 'success',
      description: 'Full end-to-end realistic workflow — all signals present',
    },
  },
];

export default scenarios;
