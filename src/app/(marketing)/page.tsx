import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Brain,
  Users,
  Building2,
  FileText,
  MessageSquare,
  Lightbulb,
  ArrowRight,
  CheckCircle,
  Shield,
  Clock,
  Search,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Layers,
  Target,
  Zap,
  Star,
  Quote,
  BarChart2,
  Compass,
  Lock,
  Calendar,
  Monitor,
} from "lucide-react"
import { cn } from "@/lib/utils"

const features = [
  {
    icon: Users,
    title: "Attendee Intelligence",
    description: "Deep profiles on every participant — role, background, recent work, and why they matter for your meeting.",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    icon: Building2,
    title: "Company Research",
    description: "Company overview, recent news, products, leadership, and strategic insights — all in one place.",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    icon: FileText,
    title: "Topic Intelligence",
    description: "Context, recent developments, and discussion angles for every agenda item.",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
  },
  {
    icon: MessageSquare,
    title: "Conversation Starters",
    description: "5-10 natural, contextual openers that reference real research — not generic small talk.",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
  },
  {
    icon: Lightbulb,
    title: "Talking Points & Questions",
    description: "Prioritized talking points, strategic questions, and follow-up angles organized by category.",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
  },
  {
    icon: Shield,
    title: "Source-Backed Research",
    description: "Every claim cites its source with credibility ratings. Facts separated from inferences.",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
  },
]

const workflowSteps = [
  { step: "01", title: "Add Meeting", description: "Enter title, time, attendees, and agenda. Takes 60 seconds." },
  { step: "02", title: "Research Runs", description: "We research people, companies, and topics in parallel." },
  { step: "03", title: "Get Your Brief", description: "AI synthesizes a scannable brief with sources and talking points." },
  { step: "04", title: "Walk In Prepared", description: "Review the 5-minute brief or full brief before the meeting." },
]

const trustPoints = [
  { icon: CheckCircle, text: "Every claim linked to a verifiable source" },
  { icon: CheckCircle, text: "Facts, inferences, and suggestions clearly labeled" },
  { icon: CheckCircle, text: "Web content treated as evidence, never instructions" },
  { icon: CheckCircle, text: "Local LLM option — your data never leaves your machine" },
  { icon: CheckCircle, text: "No hallucinated employment history or quotes" },
  { icon: CheckCircle, text: "Graceful degradation when external services fail" },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold text-lg">Meeting Prep</span>
            </div>
            <div className="hidden md:flex md:items-center md:gap-6">
              <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</Link>
              <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How it works</Link>
              <Link href="#trust" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Trust</Link>
              <Link href="#preview" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Preview</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="hidden sm:block rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                Dashboard
              </Link>
              <Link href="/meetings/new" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-sm hover:shadow-md">
                <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                Prepare a Meeting
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-32" aria-labelledby="hero-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6 animate-fade-in">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>New: 5-Minute Brief & Before You Walk In modes</span>
              </div>
              <h1 id="hero-heading" className="font-display text-display-md lg:text-display-lg font-bold tracking-tight text-foreground mb-6 animate-slide-in-from-bottom">
                Walk into every meeting <span className="gradient-text">prepared</span>
              </h1>
              <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-in-from-bottom delay-100">
                Research the people. Understand the context. Know what to ask.
                <br />
                AI-powered meeting intelligence that gives you the edge.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-in-from-bottom delay-200">
                <Link href="/meetings/new">
                  <Button size="lg" className="w-full sm:w-auto gap-2 px-8 py-3 text-base">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Prepare a Meeting
                  </Button>
                </Link>
                <Link href="#how-it-works" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 px-8 py-3 text-base">
                    See how it works
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
              <p className="mt-6 text-sm text-muted-foreground animate-fade-in delay-300">
                No credit card required · Local LLM option · 30-second setup
              </p>
            </div>

            {/* Hero Visual - Meeting Brief Preview */}
            <div className="mt-16 relative animate-scale-in delay-200">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-transparent to-purple/10 rounded-3xl blur-3xl" aria-hidden="true" />
              <BriefPreview />
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <section className="py-12 border-y border-border" aria-label="Trust indicators">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {trustPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="flex-shrink-0 mt-0.5 text-success">
                    <point.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="text-muted-foreground">{point.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 lg:py-32" aria-labelledby="features-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                <Zap className="h-3 w-3" aria-hidden="true" />
                Features
              </span>
              <h2 id="features-heading" className="font-display text-display-sm font-bold tracking-tight text-foreground mb-4">
                Everything you need to own the room
              </h2>
              <p className="text-body-lg text-muted-foreground">
                Six pillars of meeting intelligence, designed to work together seamlessly.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <FeatureCard key={i} feature={feature} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 lg:py-32 bg-muted/30" aria-labelledby="workflow-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                <Layers className="h-3 w-3" aria-hidden="true" />
                Workflow
              </span>
              <h2 id="workflow-heading" className="font-display text-display-sm font-bold tracking-tight text-foreground mb-4">
                From meeting to brief in minutes
              </h2>
              <p className="text-body-lg text-muted-foreground">
                Four steps. Zero complexity. Maximum preparation.
              </p>
            </div>
            <div className="relative">
              <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" aria-hidden="true" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                {workflowSteps.map((step, i) => (
                  <WorkflowStep key={i} step={step} index={i} total={workflowSteps.length} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Product Preview */}
        <section id="preview" className="py-24 lg:py-32" aria-labelledby="preview-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                <Monitor className="h-3 w-3" aria-hidden="true" />
                Product Preview
              </span>
              <h2 id="preview-heading" className="font-display text-display-sm font-bold tracking-tight text-foreground mb-4">
                See the brief in action
              </h2>
              <p className="text-body-lg text-muted-foreground">
                A realistic example of what your meeting brief looks like.
              </p>
            </div>
            <ProductPreview />
          </div>
        </section>

        {/* Trust Section */}
        <section id="trust" className="py-24 lg:py-32 bg-muted/30" aria-labelledby="trust-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                <Shield className="h-3 w-3" aria-hidden="true" />
                Trust & Transparency
              </span>
              <h2 id="trust-heading" className="font-display text-display-sm font-bold tracking-tight text-foreground mb-4">
                Research you can rely on
              </h2>
              <p className="text-body-lg text-muted-foreground">
                We built trust into every layer — from source attribution to hallucination prevention.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trustPoints.map((point, i) => (
                <TrustCard key={i} point={point} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* Modes Section */}
        <section className="py-24 lg:py-32" aria-labelledby="modes-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                <Target className="h-3 w-3" aria-hidden="true" />
                Brief Modes
              </span>
              <h2 id="modes-heading" className="font-display text-display-sm font-bold tracking-tight text-foreground mb-4">
                Three views for every situation
              </h2>
              <p className="text-body-lg text-muted-foreground">
                Choose the right level of detail for the time you have.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <ModeCard
                title="Full Brief"
                description="Complete meeting intelligence — attendees, companies, topics, talking points, starters, questions, and sources."
                icon={FileText}
                features={["TL;DR summary", "Attendee profiles", "Company context", "Topic intelligence", "Talking points", "Conversation starters", "Sources & citations"]}
                badge="Default"
              />
              <ModeCard
                title="5-Minute Brief"
                description="Condensed to the essentials — 3 things to know, 3 things to say, 3 things to ask, 1 thing to avoid."
                icon={Clock}
                features={["3 key insights", "3 conversation starters", "3 strategic questions", "1 watch-out", "Scannable in 3 minutes", "Mobile optimized"]}
                badge="Popular"
                badgeColor="bg-primary/10 text-primary"
              />
              <ModeCard
                title="Before You Walk In"
                description="Ultra-condensed mobile view — just the essentials you need in the elevator or hallway."
                icon={Compass}
                features={["Remember: key facts", "Say: your opener", "Ask: your question", "Avoid: assumption", "One-thumb scrollable", "Offline capable"]}
                badge="New"
                badgeColor="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 lg:py-32 relative overflow-hidden" aria-labelledby="cta-heading">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple/10" aria-hidden="true" />
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative text-center">
            <h2 id="cta-heading" className="font-display text-display-sm lg:text-display-md font-bold tracking-tight text-foreground mb-6">
              Never walk into an important meeting unprepared again
            </h2>
            <p className="text-body-lg text-muted-foreground mb-10 max-w-xl mx-auto">
              Your first brief is free. No credit card. Runs locally or in the cloud.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/meetings/new">
                <Button size="lg" className="w-full sm:w-auto gap-2 px-10 py-4 text-lg">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                  Prepare Your First Meeting
                </Button>
              </Link>
              <Link href="#features" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 px-10 py-4 text-lg">
                  Explore Features
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Works with Ollama (free, local) or your preferred LLM provider.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12 lg:py-16" role="contentinfo">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Brain className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-display font-semibold text-lg">Meeting Prep</span>
              </div>
              <p className="text-muted-foreground text-sm max-w-xs mb-6">
                AI-powered meeting preparation that gives you the edge. Research the people. Understand the context. Know what to ask.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 9.24-3.308.837-9.172-9.997-9.156 9.237-3.278-.85 8.504-9.26-7.24-8.263h3.307l3.708 4.346Z"/></svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a></li>
                <li><a href="#preview" className="hover:text-foreground transition-colors">Preview</a></li>
                <li><a href="#trust" className="hover:text-foreground transition-colors">Trust & Security</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Community</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <Separator className="my-8" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>&copy; 2026 Meeting Prep Assistant. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function BriefPreview() {
  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 text-center text-xs text-muted-foreground font-mono">
          meeting-brief.md
        </div>
        <div className="h-3 w-3 rounded-full bg-muted" />
      </div>
      <div className="p-6 max-h-[500px] overflow-y-auto">
        <div className="space-y-6 text-sm">
          <div className="pb-4 border-b border-border">
            <h3 className="font-semibold text-lg mb-1">Acme AI Partnership Discussion</h3>
            <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Tomorrow · 10:30 AM</span>
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> 3 attendees</span>
              <Badge variant="success" className="text-xs">Research Ready</Badge>
            </div>
          </div>
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-3"><Lightbulb className="h-4 w-4 text-yellow-500" /> TL;DR</h4>
            <ul className="space-y-2">
              {[
                "Acme AI recently launched ModelX — their first enterprise LLM platform",
                "Jane Doe (VP Eng) previously led ML infrastructure at Google Cloud",
                "Partnership discussions center on ModelX integration with your API gateway",
                "Acme raised $50M Series B led by Example Ventures (John Smith on board)",
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary font-medium">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-3"><Users className="h-4 w-4" /> Key Attendees</h4>
            <div className="space-y-3">
              {[
                { name: "Jane Doe", role: "VP Engineering", company: "Acme AI", insight: "Led ML infra at Google Cloud · Published on distributed training" },
                { name: "John Smith", role: "Partner", company: "Example Ventures", insight: "Invested in 12 AI infra companies · Board observer at Acme" },
                { name: "Alex Chen", role: "Tech Lead", company: "Acme AI", insight: "Core contributor to ModelX architecture · Open source maintainer" },
              ].map((a, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">{a.name.split(' ').map(n => n[0]).join('')}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.role} · {a.company}</p>
                    <p className="text-xs text-primary mt-1 truncate">{a.insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-3"><MessageSquare className="h-4 w-4" /> Conversation Starters</h4>
            <div className="space-y-2">
              {[
                '"I saw ModelX launched last month — how has the enterprise reception been so far?"',
                '"Given your background in distributed training, what bottlenecks do you see in current LLM serving?"',
                '"Example Ventures has a great portfolio — what thesis drove the Acme investment?"',
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-muted/30 text-sm">"{s}"</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  return (
    <Card className="group h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50">
      <CardHeader>
        <div className={cn("inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4", feature.bgColor)}>
          <feature.icon className={cn("h-6 w-6", feature.color)} aria-hidden="true" />
        </div>
        <CardTitle className="text-lg">{feature.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-body-sm leading-relaxed">{feature.description}</p>
      </CardContent>
    </Card>
  )
}

function WorkflowStep({ step, index, total }: { step: typeof workflowSteps[0]; index: number; total: number }) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl">
        {step.step}
      </div>
      <div className="mt-6">
        <h3 className="font-semibold text-lg">{step.title}</h3>
        <p className="mt-2 text-muted-foreground text-sm max-w-xs">{step.description}</p>
      </div>
      {index < total - 1 && (
        <div className="hidden lg:block absolute left-1/2 top-8 w-full h-px bg-border -translate-x-1/2 -z-10" aria-hidden="true" />
      )}
    </div>
  )
}

function TrustCard({ point, index }: { point: typeof trustPoints[0]; index: number }) {
  return (
    <Card className="h-full border-border/50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-0.5 text-success">
            <point.icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-body-sm text-foreground leading-relaxed">{point.text}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ModeCard({ title, description, icon: Icon, features, badge, badgeColor = "bg-muted text-muted-foreground" }: { 
  title: string; 
  description: string; 
  icon: React.ComponentType<any>;
  features: string[];
  badge: string;
  badgeColor?: string;
}) {
  return (
    <Card className="h-full flex flex-col border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <Badge variant="outline" className={badgeColor}>{badge}</Badge>
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <p className="text-muted-foreground text-body-sm mb-6">{description}</p>
        <ul className="space-y-2 mb-6 flex-1">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/meetings/new">Try {title} →</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function ProductPreview() {
  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 text-center text-xs text-muted-foreground font-mono">
          meeting-brief.md
        </div>
        <div className="h-3 w-3 rounded-full bg-muted" />
      </div>
      <div className="p-6 max-h-[500px] overflow-y-auto">
        <div className="space-y-6 text-sm">
          <div className="pb-4 border-b border-border">
            <h3 className="font-semibold text-lg mb-1">Acme AI Partnership Discussion</h3>
            <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Tomorrow · 10:30 AM</span>
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> 3 attendees</span>
              <Badge variant="success" className="text-xs">Research Ready</Badge>
            </div>
          </div>
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-3"><Lightbulb className="h-4 w-4 text-yellow-500" /> TL;DR</h4>
            <ul className="space-y-2">
              {[
                "Acme AI recently launched ModelX — their first enterprise LLM platform",
                "Jane Doe (VP Eng) previously led ML infrastructure at Google Cloud",
                "Partnership discussions center on ModelX integration with your API gateway",
                "Acme raised $50M Series B led by Example Ventures (John Smith on board)",
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary font-medium">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-3"><Users className="h-4 w-4" /> Key Attendees</h4>
            <div className="space-y-3">
              {[
                { name: "Jane Doe", role: "VP Engineering", company: "Acme AI", insight: "Led ML infra at Google Cloud · Published on distributed training" },
                { name: "John Smith", role: "Partner", company: "Example Ventures", insight: "Invested in 12 AI infra companies · Board observer at Acme" },
                { name: "Alex Chen", role: "Tech Lead", company: "Acme AI", insight: "Core contributor to ModelX architecture · Open source maintainer" },
              ].map((a, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">{a.name.split(' ').map(n => n[0]).join('')}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.role} · {a.company}</p>
                    <p className="text-xs text-primary mt-1 truncate">{a.insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-3"><MessageSquare className="h-4 w-4" /> Conversation Starters</h4>
            <div className="space-y-2">
              {[
                '"I saw ModelX launched last month — how has the enterprise reception been so far?"',
                '"Given your background in distributed training, what bottlenecks do you see in current LLM serving?"',
                '"Example Ventures has a great portfolio — what thesis drove the Acme investment?"',
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-muted/30 text-sm">"{s}"</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}