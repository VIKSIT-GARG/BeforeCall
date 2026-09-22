"use client"
import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Sparkles, Loader2, AlertTriangle, Download, RefreshCw } from "lucide-react"
import { ResearchTimeline } from "@/components/research/ResearchTimeline"
import { BriefPremium } from "@/components/brief/BriefPremium"
import { MeetingChat } from "@/components/chat/MeetingChat"
import { parseNDJSON } from "@/lib/stream"

function parseMaybe(v:any){ if(!v) return v; if(typeof v==="string") try{return JSON.parse(v)}catch{return v}; return v; }

export default function MeetingDetailPage() {
  const { id } = useParams<{id:string}>()
  const [meeting, setMeeting] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [researching, setResearching] = useState(false)
  const [progress, setProgress] = useState<{stage:any, progress:number, message:string}|null>(null)
  const [error, setError] = useState("")

  const fetchMeeting = useCallback(async()=>{
    if(!id) return
    setError("")
    try{
      const r = await fetch(`/api/meetings/${id}`)
      const d = await r.json()
      if(!d.success) throw new Error(d.error)
      setMeeting(d.data)
    }catch(e:any){ setError(e.message||"Failed to load") }
    finally{ setLoading(false)}
  },[id])
  useEffect(()=>{ void fetchMeeting() },[fetchMeeting])

  const startResearch = async()=>{
    setResearching(true); setError(""); setProgress({stage:'extracting', progress:5, message:'Starting research...'})
    try{
      const resp = await fetch(`/api/research/${id}/stream`, {method:'GET', headers: { Accept: 'application/x-ndjson' }})
      if(!resp.ok || !resp.body) throw new Error(`Research failed: ${resp.status}`)
      let lastStage: any = 'extracting'
      let prog = 5
      for await (const evt of parseNDJSON(resp.body as ReadableStream<Uint8Array>)) {
        if(evt.type === 'stage'){
          const map: Record<string, {stage:any, progress:number}> = {
            '01_MEETING_PARSED': {stage:'extracting', progress:15},
            '02_ATTENDEES_RESOLVED': {stage:'attendees', progress:25},
            'RESEARCH_RUNNING': {stage:'topics', progress:60},
            '06_BRIEF_GENERATING': {stage:'synthesizing', progress:85},
            '07_COMPLETE': {stage:'complete', progress:100},
            'error': {stage:'error', progress:0},
          }
          const m = map[evt.stage] || {stage: lastStage, progress: prog}
          lastStage = m.stage
          prog = m.progress
          setProgress({stage: m.stage, progress: m.progress, message: evt.message || evt.stage})
        } else if(evt.type==='attendee'){
          // progressive: attendee ready — update message
          setProgress(p=> ({ stage: p?.stage || 'attendees', progress: p?.progress || 30, message: `${evt.data?.name || evt.attendeeId} — ${evt.status}` }))
        } else if(evt.type==='brief_section'){
          // brief sections arrive progressively — could hydrate partial brief here
          setProgress(p=> ({ stage: p?.stage || 'synthesizing', progress: 90, message: `Brief section: ${evt.section}` }))
        } else if(evt.type==='complete'){
          setProgress({stage:'complete', progress:100, message: evt.data?.message || 'Research complete!'})
        } else if(evt.type==='error'){
          throw new Error(evt.message || 'Research failed')
        }
      }
      await fetchMeeting()
    }catch(e:any){
      setProgress({stage:'error', progress:0, message: e.message||'Research failed'})
      setError(e.message)
    }finally{ setResearching(false)}
  }

  if(loading) return <div className="space-y-4 max-w-4xl mx-auto">{[1,2,3].map(i=><div key={i} className="h-32 rounded-2xl bg-muted animate-pulse"/>)}</div>
  if(error && !meeting) return <div className="max-w-xl mx-auto py-16 text-center"><div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4"><AlertTriangle className="h-8 w-8 text-destructive"/></div><h3 className="font-semibold text-lg">Could not load meeting</h3><p className="text-muted-foreground text-sm mt-2">{error}</p><Link href="/meetings"><Button variant="outline" className="mt-6"><ArrowLeft className="h-4 w-4 mr-2"/>Back to meetings</Button></Link></div>
  if(!meeting) return null

  const hasBrief = !!meeting.brief
  const isResearching = meeting.status==='RESEARCHING' || researching

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/meetings" className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"><ArrowLeft className="h-4 w-4"/></Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-heading-lg font-bold truncate">{meeting.title}</h1>
          <p className="text-sm text-muted-foreground">{new Date(meeting.dateTime).toLocaleString()} · {meeting.attendees?.length||0} attendees · <span className="font-medium">{meeting.status}</span></p>
        </div>
        <div className="flex gap-2">
          {hasBrief && <Button variant="outline" size="sm" asChild><a href={`/api/export/${meeting.id}`} download><Download className="h-4 w-4 mr-1"/>Export</a></Button>}
          <Button size="sm" onClick={startResearch} disabled={isResearching} className="gap-2">{isResearching? <><Loader2 className="h-4 w-4 animate-spin"/>Researching</> : <><Sparkles className="h-4 w-4"/> {hasBrief? "Refresh research":"Start research"}</>}</Button>
        </div>
      </div>

      {error && hasBrief && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex gap-3"><AlertTriangle className="h-5 w-5 text-destructive shrink-0"/><div className="flex-1"><p className="text-sm font-medium text-destructive">Research issue</p><p className="text-sm text-destructive/80 mt-1">{error}</p><Button size="sm" variant="outline" className="mt-3 gap-2" onClick={startResearch}><RefreshCw className="h-4 w-4"/>Try again</Button></div></div>}

      {isResearching && progress && <ResearchTimeline stage={progress.stage} progress={progress.progress} message={progress.message}/>}

      {!hasBrief && !isResearching && (
        <Card className="border-dashed"><CardContent className="py-16 text-center"><div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4"><Sparkles className="h-8 w-8 text-primary"/></div><h3 className="font-semibold text-lg">Ready to research</h3><p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">We will research attendees, companies and topics in parallel and build your brief.</p><Button className="mt-6 gap-2" onClick={startResearch}><Sparkles className="h-4 w-4"/>Start research</Button></CardContent></Card>
      )}

      {hasBrief && !isResearching && (
        <>
          <BriefPremium meeting={meeting} brief={meeting.brief} />
          <MeetingChat meetingId={meeting.id} briefReady={true} />
        </>
      )}

      {hasBrief && isResearching && (
        <>
          <div className="opacity-60 pointer-events-none"><BriefPremium meeting={meeting} brief={meeting.brief} /></div>
          <MeetingChat meetingId={meeting.id} briefReady={true} />
        </>
      )}

      {!hasBrief && isResearching && (
        <div className="rounded-xl border border-dashed border-foreground/30 bg-muted/20 p-8 text-center">
          <p className="font-mono text-xs tracking-[0.12em] uppercase">Progressive hydration</p>
          <p className="text-sm mt-2">Meeting context appears immediately — attendees, research, evidence, then brief sections as they arrive.</p>
          <p className="text-xs text-muted-foreground mt-2">Current: {progress?.message || 'Starting...'}</p>
        </div>
      )}
    </div>
  )
}