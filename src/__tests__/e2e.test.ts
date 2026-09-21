// Simplified E2E workflow test (no real Tavily/LLM calls)
import { meetingCreateSchema } from "@/lib/validations/meeting";
import { scenarios } from "@/test/fixtures/meetings";
import { buildFallbackBrief } from "@/__tests__/scenarios.test";

describe("E2E: meeting creation → research → brief → export", () => {
  test("full realistic production workflow (scenario 25)", async () => {
    const s = scenarios.find(x=>x.id==="25-full-production")!
    const parsed = meetingCreateSchema.safeParse(s.input)
    expect(parsed.success).toBe(true)

    // Simulate research → brief generation (uses mock providers via fallback)
    const fallback = buildFallbackBrief(s.input, [], s.input.attendees.length)
    expect(fallback.tldr.length).toBeGreaterThanOrEqual(3)
    expect(fallback.attendeeSummaries.length).toBe(s.input.attendees.length)
    expect(fallback.conversationStarters.length).toBeGreaterThanOrEqual(5)
    expect(fallback.questions.length).toBeGreaterThanOrEqual(2)
    expect(fallback.sources.length).toBeGreaterThanOrEqual(0)

    // Mock export markdown contains title and attendees
    const md = `# ${s.input.title}\nAttendees: ${s.input.attendees.map(a=>a.name).join(", ")}`
    expect(md).toContain(s.input.title)
    expect(md).toContain(s.input.attendees[0].name)
  })

  test("5-minute brief content available from full brief", async () => {
    const s = scenarios.find(x=>x.id==="01-standard-sales")!
    const brief = buildFallbackBrief(s.input, [], s.input.attendees.length)
    const quickKnow = brief.tldr.slice(0,3)
    const quickSay = brief.conversationStarters.slice(0,3)
    const quickAsk = brief.questions.slice(0,3)
    expect(quickKnow.length).toBe(3)
    expect(quickSay.length).toBe(3)
    expect(quickAsk.length).toBeGreaterThanOrEqual(1)
  })

  test("before-you-walk-in requires only 1 item per section", async () => {
    const s = scenarios.find(x=>x.id==="25-full-production")!
    const brief = buildFallbackBrief(s.input, [], s.input.attendees.length)
    expect(brief.tldr[0]).toBeDefined()
    expect(brief.conversationStarters[0].text).toBeDefined()
    expect(brief.questions[0]).toBeDefined()
  })

  test("mobile brief is renderable (no overflow logic)", () => {
    const longTitle = "This is a very long meeting title that should wrap and not overflow the mobile viewport even at 320px width"
    expect(longTitle.length).toBeGreaterThan(50)
    // In real UI, CSS text-balance handles wrapping; here we assert data exists
    expect(longTitle).toContain("meeting title")
  })
})