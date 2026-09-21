"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { formatDateTime } from "@/lib/utils"
import { Plus, Calendar, Sparkles, Search, CheckCircle, Loader2, FileText, Clock, ArrowRight, Brain, Eye, MoreHorizontal } from "lucide-react"

interface Meeting {
  id: string
  title: string
  dateTime: string
  status: string
  attendees: Array<{ name: string; role?: string; company?: string }>
}

const mockMeetings: Meeting[] = [
  { id: "1", title: "Acme AI Partnership Discussion", dateTime: new Date(Date.now() + 86400000).toISOString(), status: "COMPLETED", attendees: [{ name: "Jane Doe", role: "VP Engineering", company: "Acme AI" }, { name: "John Smith", role: "Partner", company: "Example Ventures" }] },
  { id: "2", title: "Q4 Planning with Board", dateTime: new Date(Date.now() + 172800000).toISOString(), status: "RESEARCHING", attendees: [{ name: "Sarah Johnson", role: "CEO", company: "Our Company" }] },
]

export default function DashboardPage() {
  const [view, setView] = useState<"upcoming" | "recent" | "all">("upcoming")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredMeetings = mockMeetings.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.attendees.some(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
  ).filter(m => {
    const now = new Date()
    const meetingDate = new Date(m.dateTime)
    if (view === "upcoming") return meetingDate >= now
    if (view === "recent") return meetingDate < now
    return true
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Good morning!</p>
        </div>
        <Link href="/meetings/new">
          <Button className="gap-2" size="lg">
            <Plus className="h-5 w-5" />
            <Sparkles className="h-5 w-5" />
            Prepare a Meeting
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Upcoming</p><p className="text-3xl font-bold">2</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Completed</p><p className="text-3xl font-bold">1</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Prepared</p><p className="text-3xl font-bold">50%</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="search" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm" />
        </div>
        <div className="flex gap-2">
          {["upcoming", "recent", "all"].map((filter) => (
            <button key={filter} onClick={() => setView(filter as any)} className={`px-4 py-2.5 rounded-lg text-sm font-medium ${view === filter ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Meetings</CardTitle>
          <Badge variant="outline" className="text-sm">{filteredMeetings.length} meetings</Badge>
        </CardHeader>
        <CardContent>
          {filteredMeetings.map((meeting) => (
            <div key={meeting.id} className="p-4 border-b border-border flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Brain className="h-6 w-6 text-primary" /></div>
              <div className="flex-1">
                <h3 className="font-semibold">{meeting.title}</h3>
                <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDateTime(meeting.dateTime)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDistanceToNow(new Date(meeting.dateTime), { addSuffix: true })}</span>
                  <Badge variant={meeting.status === "COMPLETED" ? "success" : meeting.status === "RESEARCHING" ? "default" : "outline"}>{meeting.status}</Badge>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
