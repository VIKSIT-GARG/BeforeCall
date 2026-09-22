"use client"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function EditorialHeader({ brand = "MEETING INTELLIGENCE" }: { brand?: string }) {
  return (
    <header className="editorial-container py-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-mono text-xs tracking-[0.2em] font-bold">
          [{brand}]
        </Link>
        <nav className="flex items-center gap-6 font-mono text-[11px] tracking-[0.18em] uppercase" aria-label="Index">
          <Link href="#index" className="hover:underline underline-offset-4">Index</Link>
          <Link href="#about" className="hover:underline underline-offset-4">About</Link>
          <Link href="/dashboard" className="hidden sm:inline hover:underline underline-offset-4">Archive</Link>
        </nav>
      </div>
      <div className="hairline mt-4" aria-hidden="true" />
    </header>
  )
}

export function MetadataBar({ no = "NO. 015", date = "FRIDAY / MAY 22, 2026", read = "APPROX. 6 MIN READ" }: { no?: string; date?: string; read?: string }) {
  return (
    <div className="editorial-container">
      <div className="grid grid-cols-3 border border-foreground divide-x divide-foreground text-[10px] font-mono tracking-[0.14em] uppercase">
        <div className="px-3 py-2 text-center">{no}</div>
        <div className="px-3 py-2 text-center">{date}</div>
        <div className="px-3 py-2 text-center hidden sm:block">{read}</div>
        <div className="px-3 py-2 text-center sm:hidden">{read.split(" ")[0]}</div>
      </div>
    </div>
  )
}

export function SectionHeader({ number, label, subtitle }: { number: string; label: string; subtitle: string }) {
  return (
    <div className="space-y-3">
      <div className="hairline" aria-hidden="true" />
      <div className="flex items-baseline gap-3">
        <span className="inline-flex items-center justify-center bg-[hsl(var(--accent-yellow))] text-[hsl(var(--accent-yellow-foreground))] px-2 py-1 font-mono text-[10px] tracking-[0.14em] font-bold border border-foreground">
          SEC {number}
        </span>
        <span className="font-mono text-[11px] tracking-[0.18em] uppercase">{label}</span>
      </div>
      <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-muted-foreground max-w-xl">
        {subtitle}
      </p>
    </div>
  )
}

export function EditorialCallout({
  fig = "FIG. A",
  kicker = "TODAY'S ART DIRECTION",
  title,
  body,
  tags,
}: {
  fig?: string
  kicker?: string
  title: string
  body: string
  tags: string[]
}) {
  return (
    <div className="relative">
      <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-[hsl(var(--accent-red))] border border-foreground" aria-hidden="true" />
      <div className="relative bg-card border border-foreground">
        <div className="absolute -top-3 left-4 bg-[hsl(var(--accent-yellow))] border border-foreground px-3 py-1">
          <span className="font-mono text-[10px] tracking-[0.14em] font-bold">{fig}</span>
        </div>
        <div className="p-6 sm:p-8 pt-8">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{kicker}</p>
          <h3 className="font-display font-black text-2xl sm:text-3xl leading-none tracking-[-0.02em] uppercase mt-2">
            {title}
          </h3>
          <p className="mt-4 text-sm leading-relaxed max-w-2xl text-muted-foreground">
            {body}
          </p>
          <div className="mt-6 flex flex-wrap gap-2 border-t border-foreground/10 pt-4">
            {tags.map((t) => (
              <span key={t} className="font-mono text-[9px] tracking-[0.12em] uppercase border border-foreground px-2 py-1 bg-background">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TechnicalLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground", className)}>{children}</span>
}

export function DiagramBox({ label, sub, className }: { label: string; sub?: string; className?: string }) {
  return (
    <div className={cn("border border-foreground bg-card p-4", className)}>
      <p className="font-mono text-[10px] tracking-[0.14em] uppercase">{label}</p>
      {sub && <p className="font-mono text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

export function PullQuote({ children, cite }: { children: React.ReactNode; cite?: string }) {
  return (
    <blockquote className="border-l-2 border-foreground pl-6 py-2">
      <p className="font-display text-xl sm:text-2xl leading-tight tracking-[-0.01em]">{children}</p>
      {cite && <cite className="mt-3 block font-mono text-[11px] tracking-[0.08em] uppercase text-muted-foreground not-italic">— {cite}</cite>}
    </blockquote>
  )
}

export function FieldNote({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-foreground p-4 bg-card">
      <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-relaxed">{children}</p>
    </div>
  )
}

export function RegistrationMark({ className }: { className?: string }) {
  return (
    <div className={cn("h-4 w-4 relative", className)} aria-hidden="true">
      <div className="absolute left-1/2 top-0 h-full w-px bg-foreground" />
      <div className="absolute top-1/2 left-0 w-full h-px bg-foreground" />
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground bg-background" />
    </div>
  )
}