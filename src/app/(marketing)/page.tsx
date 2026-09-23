import Link from "next/link"

function EditorialHeader() {
  return (
    <header className="mx-auto w-full max-w-[1150px] px-8 py-5">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-mono text-[11px] tracking-[0.2em] font-bold">
          BEFORECALL
        </Link>
        <nav className="flex items-center gap-6 font-mono text-[11px] tracking-[0.18em] uppercase" aria-label="Primary">
          <Link href="/dashboard" className="hover:underline underline-offset-4">Dashboard</Link>
          <Link href="#about" className="hover:underline underline-offset-4">About</Link>
        </nav>
      </div>
      <div className="mt-4 h-px bg-foreground" aria-hidden="true" />
    </header>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EditorialHeader />

      {/* HERO — centered editorial, two-column composition centered within page */}
      <section className="mx-auto w-full max-w-[1150px] px-8 pt-10 pb-12 sm:pt-14 sm:pb-14">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.9fr] lg:gap-12 items-start">
          {/* LEFT */}
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
              FIELD NOTE — 2026 / MEETING INTELLIGENCE
            </p>
            <h1 className="font-display font-black uppercase leading-[0.82] tracking-[-0.04em] text-[48px] sm:text-[64px] lg:text-[78px] mt-4">
              <span className="block">THE</span>
              <span className="block">ROOM</span>
              <span className="block">NEEDS</span>
              <span className="block">CONTEXT.</span>
            </h1>
            <p className="mt-6 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
              Prepare for meetings with the context that matters — people, companies, topics, and recent signals.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/meetings/new"
                className="inline-flex items-center justify-center bg-foreground text-background px-6 py-3 font-mono text-xs tracking-[0.14em] uppercase border border-foreground hover:bg-background hover:text-foreground transition-colors"
              >
                Prepare a Meeting
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center bg-background text-foreground px-6 py-3 font-mono text-xs tracking-[0.14em] uppercase border border-foreground hover:bg-foreground hover:text-background transition-colors"
              >
                View Dashboard
              </Link>
            </div>
          </div>

          {/* RIGHT — simple product diagram */}
          <div className="lg:pt-2">
            <div className="border border-foreground bg-card">
              <div className="flex items-center justify-between px-4 py-2 border-b border-foreground">
                <span className="font-mono text-[10px] tracking-[0.14em] uppercase">FIG. 01 — SYSTEM — 01 / 04</span>
                <span className="font-mono text-[10px]">REV. 02</span>
              </div>
              <div className="p-5">
                {/* Vertical stack: MEETING → PEOPLE → CONTEXT → INTELLIGENCE */}
                <div className="space-y-0">
                  {[
                    { label: "MEETING", sub: "title · host · attendees · agenda" },
                    { label: "PEOPLE", sub: "identity · GitHub · LinkedIn" },
                    { label: "CONTEXT", sub: "company · topics · recent signals" },
                    { label: "INTELLIGENCE", sub: "brief · 5-min · walk-in", highlight: true },
                  ].map((step, i, arr) => (
                    <div key={step.label} className="flex flex-col items-center">
                      <div
                        className={`w-full border border-foreground px-4 py-3 text-center ${
                          step.highlight ? "bg-[hsl(var(--accent-yellow))] border-foreground" : "bg-card"
                        }`}
                      >
                        <p className="font-mono text-[11px] tracking-[0.14em] font-bold uppercase">{step.label}</p>
                        <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-muted-foreground mt-1">{step.sub}</p>
                      </div>
                      {i < arr.length - 1 && (
                        <div className="h-5 w-px bg-foreground relative my-1" aria-hidden="true">
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 border-r border-b border-foreground bg-background rotate-45" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-foreground/20 pt-3 flex justify-between font-mono text-[9px] tracking-[0.12em] uppercase text-muted-foreground">
                  <span>+ evidence chain</span>
                  <span>CONF HIGH / MED / LOW</span>
                  <span>24H CACHE</span>
                </div>
              </div>
            </div>
            <p className="mt-3 font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground text-center">
              HOST + ATTENDEES → CONTEXT → BRIEF
            </p>
          </div>
        </div>
      </section>

      {/* ONE FEATURE CALLOUT — yellow tab + red offset */}
      <section className="mx-auto w-full max-w-[1150px] px-8 pb-12">
        <div className="relative max-w-[720px] mx-auto">
          <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-[hsl(var(--accent-red))] border border-foreground" aria-hidden="true" />
          <div className="relative bg-card border border-foreground">
            <div className="absolute -top-3 left-6 bg-[hsl(var(--accent-yellow))] border border-foreground px-3 py-1">
              <span className="font-mono text-[10px] tracking-[0.14em] font-bold">FIG. A</span>
            </div>
            <div className="px-6 sm:px-8 pt-8 pb-6 text-center">
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">MEETING INTELLIGENCE — BRIEF</p>
              <h2 className="font-display font-black text-xl sm:text-2xl leading-tight tracking-[-0.02em] uppercase mt-2">
                Know who is in the room,<br /> why they're relevant,<br />and what you should know<br />before the conversation starts.
              </h2>
              <div className="mt-6 flex flex-wrap justify-center gap-2 border-t border-foreground/10 pt-4">
                {["PEOPLE", "COMPANY", "TOPICS", "SIGNALS"].map((t) => (
                  <span
                    key={t}
                    className="font-mono text-[10px] tracking-[0.12em] uppercase border border-foreground px-3 py-1 bg-background"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THREE CORE FEATURES — simple bordered editorial blocks */}
      <section className="mx-auto w-full max-w-[1150px] px-8 pb-12">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { n: "01", title: "PEOPLE", desc: "Know who you're meeting.", note: "Identity · Role · Company · GitHub/LinkedIn · Confidence" },
            { n: "02", title: "CONTEXT", desc: "Understand their background, company, and relevant work.", note: "Projects · Recent activity · Evidence chain" },
            { n: "03", title: "BRIEF", desc: "Turn the research into a concise meeting-ready briefing.", note: "TL;DR · Starters · Questions · Sources" },
          ].map((f) => (
            <div key={f.n} className="border border-foreground bg-card p-5">
              <div className="flex items-baseline gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center bg-[hsl(var(--accent-yellow))] border border-foreground font-mono text-[10px] font-bold">
                  {f.n}
                </span>
                <span className="font-mono text-[11px] tracking-[0.18em] uppercase font-bold">{f.title}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed">{f.desc}</p>
              <p className="mt-3 font-mono text-[10px] tracking-[0.08em] uppercase text-muted-foreground border-t border-foreground/10 pt-3">
                {f.note}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA — strong but compact */}
      <section className="mx-auto w-full max-w-[1150px] px-8 pb-12">
        <div className="border border-foreground bg-card">
          <div className="hairline" aria-hidden="true" />
          <div className="px-6 sm:px-10 py-8 sm:py-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <h2 className="font-display font-black text-3xl sm:text-4xl uppercase leading-none tracking-[-0.02em]">
                NEVER WALK
                <br />
                IN UNPREPARED.
              </h2>
              <p className="mt-3 font-mono text-[11px] tracking-[0.12em] uppercase text-muted-foreground">
                Prepare your next meeting in minutes.
              </p>
            </div>
            <Link
              href="/meetings/new"
              className="inline-flex bg-foreground text-background px-8 py-4 font-mono text-xs tracking-[0.14em] uppercase border border-foreground hover:bg-background hover:text-foreground transition-colors text-center justify-center shrink-0"
            >
              Prepare a Meeting
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER — minimal */}
      <footer className="mx-auto w-full max-w-[1150px] px-8 pb-8">
        <div className="h-px bg-foreground" aria-hidden="true" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase font-bold">MEETING INTELLIGENCE — 2026</p>
          <nav className="flex gap-5 font-mono text-[11px] tracking-[0.14em] uppercase" aria-label="Footer">
            <Link href="#index" className="hover:underline underline-offset-4">
              Index
            </Link>
            <Link href="#about" className="hover:underline underline-offset-4">
              About
            </Link>
            <Link href="/dashboard" className="hover:underline underline-offset-4">
              Archive
            </Link>
          </nav>
        </div>
      </footer>
      <div className="h-6" aria-hidden="true" />
    </div>
  )
}