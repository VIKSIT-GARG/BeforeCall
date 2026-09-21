"use client"
import { Check, Loader2, Circle, AlertTriangle, Search, Users, Building2, FileText, Brain } from "lucide-react"
import { cn } from "@/lib/utils"

type Stage = 'extracting'|'attendees'|'companies'|'topics'|'synthesizing'|'complete'|'error'
export function ResearchTimeline({ stage, progress, message }: { stage: Stage; progress: number; message: string }) {
  const steps: {k: Stage; label: string; icon: any}[] = [
    {k:'extracting', label:'Understanding agenda', icon: FileText},
    {k:'attendees', label:'Finding attendee context', icon: Users},
    {k:'companies', label:'Researching companies', icon: Building2},
    {k:'topics', label:'Researching recent developments', icon: Search},
    {k:'synthesizing', label:'Building conversation starters', icon: Brain},
    {k:'complete', label:'Writing your brief', icon: Check},
  ]
  const idx = steps.findIndex(s=>s.k===stage)
  const isError = stage==='error'
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold flex items-center gap-2"><Loader2 className={cn("h-5 w-5", isError?"text-destructive": stage==='complete'?"text-success":"text-primary animate-spin")} />Preparing your meeting</h3>
        <span className="text-sm font-mono text-muted-foreground">{progress}%</span>
      </div>
      <div className="relative">
        <div className="absolute left-4 top-2 bottom-2 w-px bg-border" aria-hidden/>
        <ol className="space-y-4" aria-label="Research progress">
          {steps.map((s,i)=>{
            const st = i < idx ? 'done' : i===idx ? (isError?'error': stage==='complete'?'done':'active') : 'pending'
            const Icon=s.icon
            return (
              <li key={s.k} className="flex gap-4">
                <div className={cn("relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 shrink-0",
                  st==='done'?"bg-success border-success text-white": st==='active'?"bg-primary border-primary text-white": st==='error'?"bg-destructive border-destructive text-white":"bg-background border-border text-muted-foreground"
                )}>
                  {st==='done'?<Check className="h-4 w-4"/>: st==='active'?<Loader2 className="h-4 w-4 animate-spin"/>: st==='error'?<AlertTriangle className="h-4 w-4"/>:<Circle className="h-3 w-3"/>}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className={cn("text-sm font-medium", st==='active'&&"text-foreground", st==='done'&&"text-muted-foreground", st==='pending'&&"text-muted-foreground/60")}>{s.label}</p>
                  {i===idx && <p className="text-xs text-muted-foreground mt-1">{message}</p>}
                </div>
                {st==='active' && <span className="text-xs text-primary animate-pulse">●</span>}
              </li>
            )
          })}
        </ol>
      </div>
      <div className="mt-6 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary transition-all duration-500" style={{width: `${progress}%`}}/></div>
      <p className="mt-3 text-xs text-muted-foreground text-center">{isError? "Research paused — your meeting is safe. Try again.": stage==='complete'? "Brief ready — scannable in 2-5 minutes":"Researching in parallel — this usually takes 20-40 seconds"}</p>
    </div>
  )
}