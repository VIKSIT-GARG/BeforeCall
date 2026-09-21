"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Calendar, Clock, Brain, CheckCircle, Loader2, FileText, ArrowRight } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface Meeting { id: string; title: string; dateTime: string; status: string; attendees: any[]; brief?: any; }

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  useEffect(() => {
    fetch("/api/meetings").then(r=>r.json()).then(d=>{
      if(d.success) setMeetings(d.data); else setErr(d.error||"Failed");
    }).catch(e=>setErr(String(e))).finally(()=>setLoading(false))
  }, [])

  const filtered = meetings.filter(m=> !q || m.title.toLowerCase().includes(q.toLowerCase()) || m.attendees.some((a:any)=>a.name.toLowerCase().includes(q.toLowerCase())))

  if(loading) return <div className="space-y-4">{[1,2,3].map(i=><div key={i} className="h-24 rounded-xl bg-muted animate-pulse"/> )}</div>
  if(err) return <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center"><p className="text-destructive font-medium">Could not load meetings</p><p className="text-sm text-muted-foreground mt-1">{err}</p><Button variant="outline" className="mt-4" onClick={()=>location.reload()}>Try again</Button></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="font-display text-heading-xl font-bold">Meetings</h1><p className="text-muted-foreground">All your meeting briefs</p></div>
        <Link href="/meetings/new"><Button className="gap-2"><Plus className="h-4 w-4"/> New Meeting</Button></Link>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search meetings, attendees, companies..." value={q} onChange={e=>setQ(e.target.value)} className="pl-10"/></div>
      {filtered.length===0 ? (
        <Card className="border-dashed"><CardContent className="py-16 text-center"><div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"><Search className="h-8 w-8 text-muted-foreground"/></div><h3 className="font-semibold">No meetings found</h3><p className="text-muted-foreground text-sm mt-1">{q? "Try different search terms":"Create your first meeting to get started"}</p><Link href="/meetings/new" className="inline-flex mt-4"><Button>Prepare a Meeting</Button></Link></CardContent></Card>
      ): (
        <div className="grid gap-4">
          {filtered.map(m=> {
            const isPast = new Date(m.dateTime) < new Date()
            const status = m.status==="COMPLETED"? {label:"Ready", variant:"success" as const, icon: CheckCircle} : m.status==="RESEARCHING"? {label:"Researching", variant:"default" as const, icon: Loader2} : {label:"Draft", variant:"outline" as const, icon: FileText}
            const Icon=status.icon
            return (
              <Link key={m.id} href={`/meetings/${m.id}`} className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Brain className="h-6 w-6 text-primary"/></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{m.title}</h3>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5"/>{formatDateTime(m.dateTime)}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5"/>{formatDistanceToNow(new Date(m.dateTime),{addSuffix:true})}</span>
                      <Badge variant={status.variant} className="gap-1"><Icon className="h-3 w-3"/>{status.label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">{m.attendees.slice(0,3).map((a:any,i:number)=><Badge key={i} variant="outline" className="text-xs">{a.name} {a.company?`· ${a.company}`:""}</Badge>)}{m.attendees.length>3 && <Badge variant="outline" className="text-xs">+{m.attendees.length-3}</Badge>}</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-2"/>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}