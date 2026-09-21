import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDateTime, getInitials } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  Loader2,
  FileText,
  ArrowRight,
  Brain,
  Users,
  Building2,
  Sparkles,
  AlertCircle,
} from "lucide-react"

export const dynamic = "force-dynamic"

function statusMeta(status: string) {
  switch (status) {
    case "COMPLETED":
      return { label: "Research done", variant: "success" as const, icon: CheckCircle, dot: "bg-green-500" }
    case "RESEARCHING":
      return { label: "Researching", variant: "default" as const, icon: Loader2, dot: "bg-primary" }
    case "DRAFT":
      return { label: "Draft", variant: "outline" as const, icon: FileText, dot: "bg-muted-foreground" }
    default:
      return { label: status, variant: "outline" as const, icon: FileText, dot: "bg-muted-foreground" }
  }
}

function MeetingCard({
  meeting,
}: {
  meeting: {
    id: string
    title: string
    dateTime: Date | string
    status: string
    hostName?: string | null
    location?: string | null
    attendees: Array<{ name: string; role?: string | null; company?: string | null }>
    brief?: unknown
  }
}) {
  const meta = statusMeta(meeting.status)
  const Icon = meta.icon
  const hasBrief = !!meeting.brief
  const host = meeting.hostName || "You"
  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="group flex gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all"
    >
      <div className="hidden sm:flex h-10 w-10 rounded-xl bg-primary/10 items-center justify-center shrink-0">
        <Brain className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
            {meeting.title}
          </h3>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" />
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDateTime(meeting.dateTime)}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(meeting.dateTime), { addSuffix: true })}
          </span>
          <Badge variant={meta.variant as any} className="gap-1 text-xs px-2 py-0">
            <Icon className={`h-3 w-3 ${meeting.status === "RESEARCHING" ? "animate-spin" : ""}`} />
            {meta.label}
          </Badge>
          <Badge variant={hasBrief ? "success" : "outline"} className="text-xs px-2 py-0">
            {hasBrief ? "Brief ready" : "No brief"}
          </Badge>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2 py-1 text-xs">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px]">{getInitials(host)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{host}</span>
            <span className="text-muted-foreground">· host</span>
          </span>
          {meeting.attendees.slice(0, 3).map((a, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs bg-card">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">{getInitials(a.name)}</AvatarFallback>
              </Avatar>
              <span className="font-medium truncate max-w-[90px]">{a.name}</span>
              {a.company && (
                <span className="hidden sm:inline-flex items-center gap-1 text-muted-foreground truncate max-w-[90px]">
                  <Building2 className="h-3 w-3" />
                  {a.company}
                </span>
              )}
            </span>
          ))}
          {meeting.attendees.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{meeting.attendees.length - 3}
            </Badge>
          )}
          {meeting.attendees.length === 0 && (
            <span className="text-xs text-muted-foreground">No attendees</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default async function DashboardPage() {
  let meetings: Array<{
    id: string
    title: string
    dateTime: Date
    status: string
    hostName: string | null
    location: string | null
    attendees: Array<{ name: string; role: string | null; company: string | null }>
    brief: { id: string } | null
  }> = []

  try {
    meetings = await prisma.meeting.findMany({
      orderBy: { dateTime: "asc" },
      include: {
        attendees: { select: { name: true, role: true, company: true } },
        brief: { select: { id: true } },
      },
    })
  } catch (e) {
    console.warn("Dashboard prisma fetch failed:", e)
    meetings = []
  }

  const now = new Date()
  const upcoming = meetings.filter((m) => new Date(m.dateTime) >= now).sort((a, b) => +new Date(a.dateTime) - +new Date(b.dateTime))
  const nextUp = upcoming[0] ?? null
  const recentBriefs = meetings.filter((m) => m.brief).sort((a, b) => +new Date(b.dateTime) - +new Date(a.dateTime)).slice(0, 4)
  const allSorted = [...meetings].sort((a, b) => +new Date(a.dateTime) - +new Date(b.dateTime))

  const total = meetings.length
  const researching = meetings.filter((m) => m.status === "RESEARCHING").length
  const ready = meetings.filter((m) => m.status === "COMPLETED").length

  return (
    <div className="space-y-5">
      {/* Compact header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {total ? `${total} meetings · ${ready} ready · ${researching} researching` : "Prepare your next meeting"}
          </p>
        </div>
        <Link href="/meetings/new">
          <Button className="gap-2 w-full sm:w-auto" size="sm">
            <Plus className="h-4 w-4" />
            <Sparkles className="h-4 w-4" />
            Prepare a Meeting
          </Button>
        </Link>
      </div>

      {/* Denser top: Next Up + Recent Briefs (no empty space, no sparse 3-col stats) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Next Up */}
        <Card className="lg:col-span-2 overflow-hidden border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Next Up
              </CardTitle>
              {nextUp && (
                <Badge variant="outline" className="text-xs">
                  {formatDistanceToNow(new Date(nextUp.dateTime), { addSuffix: true })}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {nextUp ? (
              <div>
                <MeetingCard meeting={nextUp} />
                <div className="mt-3 flex gap-2">
                  <Link href={`/meetings/${nextUp.id}`} className="flex-1">
                    <Button variant="default" size="sm" className="w-full gap-1.5">
                      <FileText className="h-4 w-4" />
                      Open Brief
                    </Button>
                  </Link>
                  <Link href={`/meetings/${nextUp.id}`}>
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center">
                <div className="mx-auto w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No upcoming meetings</p>
                <p className="text-xs text-muted-foreground mt-1">Create one to get research and brief in minutes</p>
                <Link href="/meetings/new" className="inline-flex mt-3">
                  <Button size="sm">Prepare a Meeting</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Briefs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Recent Briefs
              </CardTitle>
              <Link href="/meetings" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentBriefs.length > 0 ? (
              <div className="space-y-2">
                {recentBriefs.map((m) => (
                  <Link
                    key={m.id}
                    href={`/meetings/${m.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/20 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">{m.title}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {m.attendees[0]?.name ?? "—"}
                        {m.attendees[0]?.company ? ` · ${m.attendees[0].company}` : ""}
                        <span className="hidden sm:inline">· {formatDistanceToNow(new Date(m.dateTime), { addSuffix: true })}</span>
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-muted/30 p-6 text-center">
                <FileText className="h-6 w-6 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">No briefs yet</p>
                <p className="text-xs text-muted-foreground">Research a meeting to generate a brief</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dense meeting list — no sparse grid, tight cards */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">All Meetings · {allSorted.length}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="hidden sm:inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" /> Ready {ready}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-primary" /> Researching {researching}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {allSorted.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Brain className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No meetings yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Create your first meeting to get AI-powered briefs</p>
              <Link href="/meetings/new" className="inline-flex mt-4">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Prepare a Meeting
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {allSorted.map((m) => (
                <div key={m.id} className="p-2 sm:p-0">
                  <MeetingCard meeting={m} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
