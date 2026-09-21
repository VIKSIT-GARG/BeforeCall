import type { z } from 'zod';
import type { LLMProvider, LLMCallOptions } from './types';
import { parseAndValidate } from '../validation';

/**
 * Deterministic MockProvider for tests/CI.
 * Returns fixtures that satisfy Zod schemas, keyed by prompt heuristics.
 * Never throws; returns null on unknown schema only if fixture also fails validation.
 */
export class MockProvider implements LLMProvider {
  // Optional overrides for precise test control
  private jsonOverride?: string | null;
  private textOverride?: string | null;

  constructor(overrides?: { jsonResponse?: string | null; textResponse?: string | null }) {
    this.jsonOverride = overrides?.jsonResponse ?? undefined;
    this.textOverride = overrides?.textResponse ?? undefined;
  }

  setJsonOverride(v: string | null): void {
    this.jsonOverride = v;
  }
  setTextOverride(v: string | null): void {
    this.textOverride = v;
  }

  async generateJSON<T>(prompt: string, schema: z.ZodSchema<T>, _options?: LLMCallOptions): Promise<T | null> {
    // If override is set, try to use it (validates, simulates repair flow deterministically)
    if (this.jsonOverride !== undefined) {
      if (this.jsonOverride === null) return null;
      const result = parseAndValidate(this.jsonOverride, schema);
      return result.success ? result.data : null;
    }

    const lower = prompt.toLowerCase();

    // Heuristic fixtures — must pass the provided schema via validation
    const candidates: string[] = [];

    // Attendee profile
    if (lower.includes('attendee') || lower.includes('professional profile') || lower.includes('currentrole')) {
      candidates.push(
        JSON.stringify({
          currentRole: 'Senior Product Manager',
          currentCompany: 'Example Corp',
          previousRoles: [{ role: 'Product Manager', company: 'Prior Co', duration: '2 years' }],
          expertise: ['Product Strategy', 'User Research'],
          notableProjects: [{ name: 'LaunchX', description: 'Led product launch', link: 'https://example.com' }],
          interests: ['AI', 'Design'],
          bio: 'Experienced PM focused on AI products. Information not verified for unpublished details.',
          avatarUrl: null,
          sources: [{ title: 'Example Profile', url: 'https://example.com/profile', type: 'professional', credibility: 'medium' }],
        })
      );
    }

    // Company research
    if (lower.includes('company brief') || lower.includes('company research') || lower.includes('"summary"') && lower.includes('recentnews')) {
      candidates.push(
        JSON.stringify({
          summary: 'Example Corp is a technology company focused on AI tooling.',
          recentNews: [{ title: 'Example raises Series A', url: 'https://example.com/news', date: '2024-01-15', summary: 'Funding round announcement.' }],
          products: [{ name: 'ExampleAI', description: 'AI assistant', url: 'https://example.com/product' }],
          keyPeople: [{ name: 'Jane Doe', role: 'CEO', profileUrl: 'https://example.com/jane' }],
          insights: 'Consider asking about roadmap priorities.',
          sources: [{ title: 'Example Official', url: 'https://example.com', type: 'official', credibility: 'high' }],
        })
      );
      // Fallback if above heuristic didn't trigger but prompt is company-like
      if (!lower.includes('attendee')) {
        // keep
      }
    }

    // Meeting brief parts
    if (lower.includes('tldr') || lower.includes('talkingpoints') || lower.includes('conversationstarters')) {
      candidates.push(
        JSON.stringify({
          tldr: ['Focus on product roadmap alignment', 'Explore partnership opportunity', 'Clarify Q3 priorities'],
          talkingPoints: {
            highPriority: ['Roadmap alignment'],
            opportunity: ['Co-marketing'],
            questions: ['What are success metrics?'],
            followUp: ['Share deck'],
          },
          conversationStarters: [{ text: 'I saw your LaunchX announcement—how did you prioritize that?', context: 'Recent launch', attendee: 'Attendee' }],
          questions: ['What does success look like in 6 months?'],
          watchOuts: ['Avoid unverified claims about funding'],
        })
      );
    }

    // Topic briefs (expects array)
    if (lower.includes('topic') && (lower.includes('context') || lower.includes('whyitmatters'))) {
      candidates.push(
        JSON.stringify([
          {
            topic: 'AI Strategy',
            context: 'AI adoption is accelerating across industries.',
            recentDevelopments: 'Recent model releases show improved reasoning.',
            whyItMatters: 'Relevant for competitive positioning.',
            discussionAngle: 'Consider asking how they evaluate build vs buy.',
            sources: [{ title: 'AI News', url: 'https://example.com/ai', type: 'news', credibility: 'medium' }],
          },
        ])
      );
    }

    // Topics extraction (string[])
    if (lower.includes('extract') && lower.includes('topic')) {
      candidates.push(JSON.stringify(['Product Strategy', 'Market Expansion', 'AI Tooling']));
    }

    // Generic array fallback
    candidates.push(JSON.stringify([]));
    candidates.push(JSON.stringify({}));

    for (const c of candidates) {
      const result = parseAndValidate(c, schema);
      if (result.success) return result.data;
    }

    // If nothing validated, graceful failure
    return null;
  }

  async generateText(prompt: string, _options?: LLMCallOptions): Promise<string | null> {
    if (this.textOverride !== undefined) return this.textOverride;
    // Deterministic: echo truncated prompt as text, useful for tests
    if (!prompt) return null;
    return `Mock response for: ${prompt.slice(0, 120)}`;
  }
}
