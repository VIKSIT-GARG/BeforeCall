import Link from "next/link"
import { EditorialHeader, MetadataBar, SectionHeader, EditorialCallout, PullQuote, FieldNote, RegistrationMark, TechnicalLabel, DiagramBox } from "@/components/editorial"

export default function EditorialLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EditorialHeader brand="MEETING INTELLIGENCE — ISSUE 015" />
      <MetadataBar no="NO. 015" date="FRIDAY / MAY 22, 2026" read="APPROX. 6 MIN READ — REV. 01" />

      {/* HERO — massive condensed, asymmetric editorial */}
      <section className="editorial-container pt-10 pb-12 sm:pt-16 sm:pb-16">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-8 items-start">
          <div className="relative">
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">FIELD NOTE — 2026.05 / SYSTEM 03</p>
            <h1 className="font-display font-black uppercase leading-[0.85] tracking-[-0.04em] text-[44px] sm:text-[64px] lg:text-[88px] mt-3">
              <span className="block">THE</span>
              <span className="block">ROOM</span>
              <span className="block">NEEDS</span>
              <span className="block relative">
                CONTEXT.
                <span className="absolute -right-6 -top-2 hidden sm:block"><RegistrationMark /></span>
              </span>
            </h1>
            <div className="mt-6 flex items-center gap-3">
              <span className="h-px w-12 bg-foreground hidden sm:block" aria-hidden="true" />
              <p className="font-mono text-[11px] tracking-[0.14em] uppercase">ISSUE 015 — MEETING INTELLIGENCE PLATFORM — 2026</p>
            </div>
            <p className="mt-8 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">
              The interface between an agent and its environment is becoming as important as the model itself. This issue documents a precise, evidence-backed context layer for meetings: <em className="not-italic font-medium text-foreground">who is in the room, what they do, and why it matters</em> — rendered as a technical publication.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/meetings/new" className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-3 font-mono text-xs tracking-[0.14em] uppercase border border-foreground hover:bg-background hover:text-foreground transition-colors">
                Prepare a Meeting — SEC 01
                <span aria-hidden="true">→</span>
              </Link>
              <Link href="/dashboard" className="inline-flex items-center gap-2 bg-background text-foreground px-5 py-3 font-mono text-xs tracking-[0.14em] uppercase border border-foreground hover:bg-foreground hover:text-background transition-colors">
                Open Archive / Dashboard
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-foreground pt-4 font-mono text-[10px] tracking-[0.12em] uppercase">
              <div><p className="text-muted-foreground">COORD</p><p className="font-bold">40.7129 N / 74.0060 W</p></div>
              <div><p className="text-muted-foreground">REV</p><p className="font-bold">02 — 2026.05.22</p></div>
              <div><p className="text-muted-foreground">SYSTEM</p><p className="font-bold">MI-015 / INK + PAPER</p></div>
            </div>
          </div>

          {/* Technical diagram — meeting intelligence system */}
          <div className="lg:pl-6">
            <div className="border border-foreground bg-card p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.14em] uppercase">FIG. 01 — SYSTEM DIAGRAM</span>
                <span className="font-mono text-[10px] tracking-[0.14em]">03 / 07</span>
              </div>
              <div className="hairline-muted my-3" aria-hidden="true" />
              {/* Thin-line system: Host → Attendees → Context → Brief */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <DiagramBox label="HOST" sub="You · owner" />
                <div className="flex items-center justify-center"><span className="h-px w-full bg-foreground relative"><span className="absolute right-0 -top-1 h-2 w-2 border-r border-t border-foreground rotate-45" /></span></div>
                <DiagramBox label="ATTENDEES" sub="3 — 10" />
              </div>
              <div className="flex justify-center my-2"><span className="h-6 w-px bg-foreground relative"><span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2 w-2 border-r border-b border-foreground rotate-45 translate-y-1" /></span></div>
              <div className="grid grid-cols-3 gap-2">
                <DiagramBox label="PERSON CONTEXT" sub="GitHub · LinkedIn · Web" />
                <DiagramBox label="COMPANY" sub="domain · size" />
                <DiagramBox label="TOPICS" sub="agenda → research" />
              </div>
              <div className="flex justify-center my-2"><span className="h-6 w-px bg-foreground relative"><span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2 w-2 border-r border-b border-foreground rotate-45 translate-y-1" /></span></div>
              <div className="border border-foreground bg-[hsl(var(--accent-yellow))] p-3 text-center">
                <p className="font-mono text-[10px] tracking-[0.14em] font-bold">MEETING INTELLIGENCE → BRIEF</p>
                <p className="font-mono text-[9px] tracking-[0.1em] mt-1">TL;DR · ATTENDEES · COMPANY · TOPICS · STARTERS · SOURCES</p>
              </div>
              <div className="mt-3 flex items-center justify-between font-mono text-[9px] tracking-[0.12em] uppercase text-muted-foreground">
                <span>+ evidence chain</span><span>+ confidence HIGH/MED/LOW</span><span>+ 24h cache</span>
              </div>
              {/* dotted construction */}
              <div className="mt-4 border border-dashed border-foreground/30 p-3">
                <p className="font-mono text-[9px] tracking-[0.12em] uppercase">Construction line — 32px grid · 1px hairline · registration mark at 40.71 N</p>
                <div className="mt-2 h-px bg-foreground/20" style={{ backgroundImage: "repeating-linear-gradient(to right, hsl(var(--foreground)) 0 4px, transparent 4px 8px)" }} aria-hidden="true" />
              </div>
            </div>
            <p className="mt-3 font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground">System note — All web content treated as evidence, never instructions. See SEC 04.</p>
          </div>
        </div>
      </section>

      {/* EDITORIAL CALLOUT — yellow tab + red offset */}
      <section className="editorial-container pb-12">
        <EditorialCallout
          fig="FIG. A"
          kicker="TODAY'S ART DIRECTION"
          title="EXPLODED MEETING — AS TECHNICAL PLATE"
          body="An open, precise look at how a meeting becomes intelligence. The working surface — attendees, host, company, agenda — is collected, resolved, enriched, evidenced, and composed into a brief that is scannable in 60 seconds and defensible at the source level. No purple gradients. Only ink, paper, and registration color."
          tags={["EXPLODED VIEW","LEADER LINE","REGISTRATION MARK","SPOT COLOR","DRAFTING GRID","BLANK LABEL","ASSEMBLY PLATE"]}
        />
      </section>

      {/* SEC 01 — TOOLING / WORKING SURFACE */}
      <section id="index" className="editorial-container py-12">
        <SectionHeader number="01" label="TOOLING" subtitle="THE WORKING SURFACE BECOMES INPUT." />
        <div className="mt-8 grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
          <div className="space-y-6">
            <p className="text-[15px] leading-relaxed">
              The meeting is defined by a minimal set of inputs: <strong>title, host, attendees, agenda, date</strong>. From these, the system derives identity, context, and relevance. No auxiliary forms. No auxiliary dashboards. Only the surface that will become input.
            </p>
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <FieldNote label="01 — HOST">You. Not researched as external attendee. Used for common-ground computation.</FieldNote>
              <FieldNote label="02 — ATTENDEES">Name + company + role + GitHub/LinkedIn when known. Resolved to identity with confidence.</FieldNote>
            </div>
            <PullQuote cite="ENGINEERING MANUAL — 1968, REPRINT 2026">
              The best tool disappears into the work it enables.
            </PullQuote>
            <div className="border border-foreground">
              <div className="grid grid-cols-3 divide-x divide-foreground font-mono text-[10px] tracking-[0.12em] uppercase">
                <div className="p-3"><p className="font-bold">Input</p><p className="text-muted-foreground mt-1">Title · Host · 3–10 attendees · Agenda</p></div>
                <div className="p-3"><p className="font-bold">Derived</p><p className="text-muted-foreground mt-1">Identity · Company · Topics · Evidence</p></div>
                <div className="p-3"><p className="font-bold">Output</p><p className="text-muted-foreground mt-1">Brief · 5-min · Walk-in</p></div>
              </div>
            </div>
          </div>
          <div className="border border-foreground bg-card p-4">
            <TechnicalLabel className="mb-3 block">ATTENDEE INPUT — WIREFRAME 240×320</TechnicalLabel>
            <div className="space-y-3">
              <div className="border border-foreground p-3">
                <p className="font-mono text-[10px] tracking-[0.14em] uppercase">Attendee 01 — Sarah Chen</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="border border-foreground/30 bg-background p-2"><p className="font-mono text-[9px]">NAME *</p><p className="text-sm">Sarah Chen</p></div>
                  <div className="border border-foreground/30 bg-background p-2"><p className="font-mono text-[9px]">COMPANY</p><p className="text-sm">Acme AI</p></div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="border border-foreground/30 bg-background p-2"><p className="font-mono text-[9px]">GITHUB</p><p className="font-mono text-xs">octocat</p></div>
                  <div className="border border-foreground/30 bg-background p-2"><p className="font-mono text-[9px]">LINKEDIN</p><p className="font-mono text-xs">linkedin.com/in/…</p></div>
                </div>
                <div className="mt-3 flex gap-2">
                  <span className="bg-[hsl(var(--accent-yellow))] border border-foreground px-2 py-1 font-mono text-[9px]">GitHub ✓</span>
                  <span className="bg-[hsl(var(--accent-yellow))] border border-foreground px-2 py-1 font-mono text-[9px]">Company ✓</span>
                  <span className="border border-foreground px-2 py-1 font-mono text-[9px] bg-card">Confidence: HIGH</span>
                </div>
              </div>
              <FieldNote label="FIELD NOTE — SEC 01.03">Identity confidence uses name+company+role+linkedin+github+email. Insufficient → UNRESOLVED, asks for more info. Never guesses.</FieldNote>
            </div>
          </div>
        </div>
      </section>

      {/* SEC 02 — CONTEXT ENGINE */}
      <section className="editorial-container py-12">
        <SectionHeader number="02" label="CONTEXT ENGINE" subtitle="FROM REGISTRATION → GIT HUB → WEB → EVIDENCE → PROFILE." />
        <div className="mt-8 grid lg:grid-cols-2 gap-8">
          <div className="border border-foreground bg-card">
            <div className="p-4 border-b border-foreground flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-[0.14em]">PIPELINE — STAGED, PARALLEL</span>
              <span className="font-mono text-[10px]">REV. 02</span>
            </div>
            <div className="p-4 space-y-2 font-mono text-[11px]">
              <div className="flex items-center gap-2"><span className="h-2 w-2 bg-foreground" /> Host (You) — excluded from external research</div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 bg-foreground" /> Attendees ×3 — bounded parallel (semaphore 3)</div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 border border-foreground" /> GitHub profile + repos + events (10s, cached 24h)</div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 border border-foreground" /> Tavily search — 3/attendee, 4/company, 1/topic, budget ≤30</div>
              <div className="h-px bg-foreground my-2" />
              <div className="flex items-center gap-2"><span className="h-2 w-2 bg-[hsl(var(--accent-yellow))] border border-foreground" /> LLM synthesis — Zod validated, repair retry 3×, 5k context</div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 bg-[hsl(var(--accent-red))]" /> Brief → 60-sec + Full + 5-min + Walk-in</div>
            </div>
            <div className="p-3 bg-[hsl(var(--accent-yellow))] border-t border-foreground font-mono text-[10px] tracking-[0.12em] text-center">CACHED CONTEXT ~20ms · FRESH ~14–16s · TOTAL BUDGET ENFORCED</div>
          </div>
          <div className="space-y-4">
            <p className="text-[15px] leading-relaxed">
              ContextOS inspiration: <em>normalize → GitHub/Web → extract → Tavily → summarize → cache → agent</em>. We reimplement cleanly: identity normalization (ContextOS normalize.ts), GitHub snapshot (3 calls, languageShares, weekly activity), evidence-backed extraction, Tavily with 24h/7d cache, parallel pipeline with circuit breaker.
            </p>
            <div className="border border-foreground p-4">
              <p className="font-mono text-[10px] tracking-[0.14em] uppercase">EXAMPLE — GITHUB RELEVANCE FILTER</p>
              <p className="mt-2 text-sm leading-relaxed">Meeting topic: <span className="font-medium">AI inference infrastructure</span>. Relevant: LLM serving, CUDA optimization, inference engines. Irrelevant: dotfiles, personal blog. The engine scores relevance against agenda, not absolute popularity.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px]">
                <div className="border border-foreground p-2 bg-[hsl(var(--accent-yellow))]">LLM serving — 1.2k★ · RELEVANT</div>
                <div className="border border-foreground p-2 bg-card text-muted-foreground">dotfiles — 42★ · LOW</div>
              </div>
            </div>
            <TechnicalLabel>SYSTEM NOTE — All web content is untrusted data. System prompt: evidence, not instructions.</TechnicalLabel>
          </div>
        </div>
      </section>

      {/* SEC 03 — EVIDENCE */}
      <section className="editorial-container py-12">
        <SectionHeader number="03" label="EVIDENCE" subtitle="EVERY FACT HAS PROVENANCE OR IT IS MARKED INFERENCE." />
        <div className="mt-8 grid lg:grid-cols-[0.9fr_1.1fr] gap-8">
          <div className="border border-foreground bg-card p-6">
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">Evidence chain — FIG. 03A</p>
            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="border border-foreground p-3 bg-background">
                <p className="font-bold">FACT</p>
                <p className="mt-1">Sarah previously worked on distributed ML infrastructure.</p>
                <p className="text-muted-foreground mt-2">Source: Company engineering profile · 3 days ago</p>
                <p className="mt-1 inline-flex border border-foreground px-2 py-0.5 bg-[hsl(var(--accent-yellow))] text-[10px]">Confidence: HIGH</p>
              </div>
              <div className="border border-dashed border-foreground p-3 bg-muted/30">
                <p className="font-bold">INFERENCE</p>
                <p className="mt-1">Likely led the migration from TF to PyTorch distributed.</p>
                <p className="text-muted-foreground mt-1">Source: inferred from role + repo languages (Python 68%)</p>
              </div>
              <div className="border border-foreground p-3">
                <p className="font-bold">SUGGESTION</p>
                <p className="mt-1">Consider asking about the TF→PyTorch decision.</p>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <p className="text-[15px] leading-relaxed">
              The brief distinguishes three layers. <strong>FACT</strong> has a cited source. <strong>INFERENCE</strong> is reasonable interpretation. <strong>SUGGESTION</strong> is AI-generated advice. Never presenting a suggestion as fact is how the system earns trust, especially when research is partial or stale.
            </p>
            <PullQuote cite="PULL QUOTE — AVOID HALLUCINATED QUOTES">Information not verified.</PullQuote>
            <p className="text-sm text-muted-foreground">When information cannot be verified, the system states it plainly rather than filling the gap. Watch-outs and low-confidence badges are first-class.</p>
            <div className="flex flex-wrap gap-2 font-mono text-[10px]">
              <span className="border border-foreground px-2 py-1 bg-[hsl(var(--accent-yellow))]">FACT ✓ Source</span>
              <span className="border border-foreground px-2 py-1">INFERENCE <em> Likely</em></span>
              <span className="border border-foreground px-2 py-1">SUGGESTION <em>Consider…</em></span>
            </div>
          </div>
        </div>
      </section>

      {/* SEC 04 — INTELLIGENCE PANEL */}
      <section className="editorial-container py-12">
        <SectionHeader number="04" label="INTELLIGENCE" subtitle="WHO'S IN THE ROOM, SHARED CONTEXT, RECENT SIGNALS." />
        <div className="mt-8 border border-foreground">
          <div className="grid sm:grid-cols-4 divide-x divide-foreground divide-y sm:divide-y-0 font-mono text-[10px] tracking-[0.12em] uppercase">
            <div className="p-4"><p className="font-bold">Host</p><p className="text-muted-foreground mt-1">You — owner</p></div>
            <div className="p-4"><p className="font-bold">Attendees</p><p className="text-muted-foreground mt-1">3 · 4 · High relevance</p></div>
            <div className="p-4"><p className="font-bold">Common Ground</p><p className="text-muted-foreground mt-1">LLM infra · OSS</p></div>
            <div className="p-4"><p className="font-bold">Recent Signals</p><p className="text-muted-foreground mt-1">3 repos · 2 weeks</p></div>
          </div>
          <div className="border-t border-foreground p-4 grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-mono text-[10px] tracking-[0.14em] uppercase">WHY THIS MATTERS</p>
              <p className="mt-2 leading-relaxed">Sarah's recent work on inference infrastructure directly overlaps with the technical integration you plan to discuss. Her GitHub shows 4 relevant repos around LLM serving.</p>
            </div>
            <div className="border border-foreground p-3 bg-[hsl(var(--accent-yellow))]">
              <p className="font-mono text-[10px] tracking-[0.14em] uppercase">COMMON GROUND ENGINE</p>
              <p className="mt-2 text-sm">Both you and Sarah maintain open-source inference tooling. Shared vocabulary: CUDA, vLLM, agent frameworks. Overlap only surfaced when evidenced.</p>
            </div>
          </div>
        </div>
        <div className="mt-6 grid sm:grid-cols-3 gap-3 font-mono text-[10px]">
          <FieldNote label="30 — SEARCH">Server-side indexed, ≤5 per category, cached 60s. Use ⌘K.</FieldNote>
          <FieldNote label="31 — NOTIFICATIONS">Research complete · Meeting in 30 min · Failed → persist, poll 15s, unread dot.</FieldNote>
          <FieldNote label="32 — EXPORT">Markdown + JSON, always real. No fake buttons.</FieldNote>
        </div>
      </section>

      {/* SEC 05 — PERFORMANCE */}
      <section className="editorial-container py-12">
        <SectionHeader number="05" label="PERFORMANCE" subtitle="MEASURED, NOT CLAIMED. CACHED, NOT RE-FETCHED." />
        <div className="mt-8 border border-foreground">
          <div className="grid grid-cols-4 font-mono text-[10px] tracking-[0.12em] uppercase divide-x divide-foreground bg-foreground text-background">
            <div className="p-2 text-center">Metric</div>
            <div className="p-2 text-center">Before</div>
            <div className="p-2 text-center">After</div>
            <div className="p-2 text-center bg-[hsl(var(--accent-yellow))] text-foreground">Improvement</div>
          </div>
          {[
            ["Tavily+LLM attendees (4×)", "15.6s", "7.8s", "50%"],
            ["Total pipeline (fresh)", "28–32s", "14–16s", "50%"],
            ["Total (cached)", "30s", "3–4s", "90%"],
            ["Search", "140ms", "18ms", "87%"],
            ["Tavily queries / run", "70", "≤30 (budget)", "capped"],
          ].map(r=>(
            <div key={r[0]} className="grid grid-cols-4 font-mono text-xs divide-x divide-foreground border-t border-foreground">
              <div className="p-2">{r[0]}</div><div className="p-2 text-center">{r[1]}</div><div className="p-2 text-center">{r[2]}</div><div className="p-2 text-center bg-[hsl(var(--accent-yellow))] font-bold">{r[3]}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground">Method: parallel semaphore 3, smart planner (user→cache→GitHub→Tavily→LLM), Tavily 24h + GitHub 24h, LLM 24h, circuit breaker 3→60s.</p>
      </section>

      {/* CTA — editorial, not SaaS */}
      <section className="editorial-container py-12">
        <div className="border border-foreground p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] tracking-[0.18em] uppercase">ISSUE 015 — FINAL PLATE</p>
              <h2 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-[-0.02em] leading-none mt-2">NEVER WALK<br/>IN UNPREPARED.</h2>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <Link href="/meetings/new" className="inline-flex bg-foreground text-background px-6 py-3 font-mono text-xs tracking-[0.14em] uppercase border border-foreground hover:bg-background hover:text-foreground text-center justify-center">
                Prepare a Meeting — FREE
              </Link>
              <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">No credit card · Local Ollama or hosted LLM · Tavily research</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER — editorial */}
      <footer className="editorial-container py-8">
        <div className="hairline" aria-hidden="true" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6">
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase font-bold">MEETING INTELLIGENCE — ISSUE 015 / 2026</p>
          <nav className="flex gap-4 font-mono text-[11px] tracking-[0.14em] uppercase">
            <Link href="#" className="hover:underline">Index</Link>
            <Link href="#" className="hover:underline">About</Link>
            <Link href="#" className="hover:underline">Archive</Link>
            <Link href="#" className="hover:underline">Contact</Link>
          </nav>
        </div>
        <div className="flex justify-between font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground mt-4">
          <span>ISSUE 015 — 2026 — REV. 02</span><span> PRINTED IN CACHYOS — NIRI 26.04</span>
        </div>
      </footer>
      <div className="h-8" aria-hidden="true" />
    </div>
  )
}