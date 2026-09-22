"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials, cn, formatDateTime } from "@/lib/utils"
import { Lightbulb, Users, Building2, FileText, MessageSquare, HelpCircle, AlertTriangle, ExternalLink, Clock, Compass, Download, Copy, Check, Share2, ChevronDown, Eye } from "lucide-react"

function parse(v:any){ if(!v) return null; if(typeof v==="string") try{return JSON.parse(v)}catch{return v}; return v; }

export function BriefPremium({ brief, meeting }: { brief:any; meeting:any }) {
  const [mode, setMode] = useState<'full'|'five'|'walkin'>('full')
  const [copied, setCopied] = useState(false)
  const tldr = parse(brief.tldr) || []
  const attendees = parse(brief.attendeeSummaries) || []
  const companies = parse(brief.companyContext) || []
  const topics = parse(brief.topicBriefs) || []
  const starters = parse(brief.conversationStarters) || []
  const tps = parse(brief.talkingPoints) || {highPriority:[], opportunity:[], questions:[], followUp:[]}
  const questions = parse(brief.questions) || []
  const watch = parse(brief.watchOuts) || []
  const sources = parse(brief.sources) || []

  const quickKnow = tldr.slice(0,3)
  const quickSay = starters.slice(0,3).map((s:any)=>s.text)
  const quickAsk = questions.slice(0,3)
  const quickAvoid = watch[0] || "Don't assume decisions have already been made."

  const copyBrief = async()=>{ const txt = document.getElementById("brief-content")?.innerText||""; await navigator.clipboard.writeText(txt); setCopied(true); setTimeout(()=>setCopied(false),2000)}
  const exportHref = `/api/export/${meeting.id}?format=markdown`

  if((mode as string)==='five'){
    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4 sm:p-0">
        <div className="flex gap-2 sticky top-16 z-10 bg-background/80 backdrop-blur py-2"><Button size="sm" variant="ghost" onClick={()=>setMode('full')}>Full</Button><Button size="sm" variant="secondary" onClick={()=>setMode('five')}><Clock className="h-4 w-4 mr-1"/>5-Min</Button><Button size="sm" variant="ghost" onClick={()=>setMode('walkin')}><Compass className="h-4 w-4 mr-1"/>Walk-in</Button></div>
        <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-6"><div className="text-center"><p className="text-xs font-mono tracking-widest text-primary">5-MINUTE BRIEF</p><h2 className="font-display text-display-sm font-bold mt-2">{meeting.title}</h2><p className="text-muted-foreground text-sm mt-1">{formatDateTime(meeting.dateTime)} · {attendees.length} people</p></div></CardContent></Card>
        <section className="grid gap-4 sm:grid-cols-3">
          <MiniCard title="3 things to know" icon={Eye} items={quickKnow}/>
          <MiniCard title="3 things to say" icon={MessageSquare} items={quickSay.map((s:string)=>`“${s}”`)}/>
          <MiniCard title="3 things to ask" icon={HelpCircle} items={quickAsk}/>
        </section>
        <Card className="border-destructive/20 bg-destructive/5"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5"/>1 thing to avoid</CardTitle></CardHeader><CardContent><p className="text-sm">{quickAvoid}</p></CardContent></Card>
        <div className="flex gap-2 justify-center"><Button variant="outline" onClick={()=>setMode('full')}>See full brief</Button><Button asChild><a href={exportHref} download><Download className="h-4 w-4 mr-2"/>Export Markdown</a></Button></div>
      </div>
    )
  }
  if((mode as string)==='walkin'){
    return (
      <div className="max-w-md mx-auto min-h-[80vh] flex flex-col p-4 space-y-6">
        <div className="flex gap-2 sticky top-16 z-10 bg-background/80 backdrop-blur py-2"><Button size="sm" variant="ghost" onClick={()=>setMode('full')}>Full</Button><Button size="sm" variant="ghost" onClick={()=>setMode('five')}>5-Min</Button><Button size="sm" variant="secondary" onClick={()=>setMode('walkin')}><Compass className="h-4 w-4 mr-1"/>Walk-in</Button></div>
        <Card className="border-none shadow-none bg-transparent p-0"><CardContent className="p-0 space-y-8 pt-6">
          <div className="text-center"><p className="text-xs font-mono tracking-widest text-primary">BEFORE YOU WALK IN</p><h1 className="font-display text-2xl font-bold mt-2 leading-tight">{meeting.title}</h1></div>
          <BlockWalk title="REMEMBER" items={quickKnow} color="text-foreground"/>
          <BlockWalk title="SAY" items={quickSay.slice(0,1).map((s:string)=>`“${s}”`)} color="text-primary"/>
          <BlockWalk title="ASK" items={quickAsk.slice(0,1)} color="text-foreground"/>
          <BlockWalk title="AVOID" items={[quickAvoid]} color="text-destructive"/>
          <div className="pt-8 flex gap-3"><Button className="flex-1" onClick={()=>setMode('five')}>5-min brief</Button><Button variant="outline" className="flex-1" asChild><a href={exportHref} download>Export</a></Button></div>
        </CardContent></Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" id="brief-content">
      {/* Mode switch + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 sticky top-16 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-4 px-4 py-3 border-b border-border lg:mx-0 lg:px-0">
        <div className="flex gap-1 p-1 rounded-full bg-muted">
          <button onClick={()=>setMode('full')} className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors", (mode as string)==='full'?"bg-background shadow-sm text-foreground":"text-muted-foreground hover:text-foreground")}>Full brief</button>
          <button onClick={()=>setMode('five')} className={cn("px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1", (mode as string)==='five'?"bg-background shadow-sm":"text-muted-foreground")}><Clock className="h-3.5 w-3.5"/>5-min</button>
          <button onClick={()=>setMode('walkin')} className={cn("px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1", (mode as string)==='walkin'?"bg-background shadow-sm":"text-muted-foreground")}><Compass className="h-3.5 w-3.5"/>Walk-in</button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyBrief} aria-label="Copy brief">{copied?<Check className="h-4 w-4 mr-1"/>:<Copy className="h-4 w-4 mr-1"/>}{copied?"Copied":"Copy"}</Button>
          <Button variant="outline" size="sm" asChild><a href={exportHref} download><Download className="h-4 w-4 mr-1"/>Export</a></Button>
        </div>
      </div>

      {/* Header */}
      <Card className="overflow-hidden border-primary/20">
        <div className="h-1 bg-gradient-to-r from-primary via-primary to-amber-600"/>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <p className="text-xs font-mono tracking-widest text-primary">{new Date(meeting.dateTime) < new Date() ? "PAST MEETING" : `MEETING IN ${Math.max(1, Math.ceil((new Date(meeting.dateTime).getTime()-Date.now())/60000))} MIN`}</p>
              <h1 className="font-display text-heading-xl font-bold mt-1 text-balance">{meeting.title}</h1>
              <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4"/>{formatDateTime(meeting.dateTime)} · {meeting.duration||60} min</span>
                <span className="flex items-center gap-1"><Users className="h-4 w-4"/>{attendees.length} attendees</span>
                {meeting.hostName && <span className="flex items-center gap-1">· Hosted by {meeting.hostName}</span>}
                {meeting.location && <span>{meeting.location}</span>}
              </div>
            </div>
            <Badge variant="success" className="self-start">Research ready</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 60-Second Version */}
      <Card className="border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader><CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100"><Clock className="h-5 w-5 text-amber-600"/>THE 60-SECOND VERSION</CardTitle></CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div><h4 className="font-semibold text-sm flex items-center gap-2"><Eye className="h-4 w-4"/>3 to know</h4><ul className="mt-2 space-y-2 text-sm">{quickKnow.map((k:string,i:number)=><li key={i} className="flex gap-2"><span className="text-primary font-medium">{i+1}.</span><span>{k}</span></li>)}</ul></div>
          <div><h4 className="font-semibold text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4"/>3 to say</h4><ul className="mt-2 space-y-2 text-sm">{quickSay.slice(0,3).map((s:string,i:number)=><li key={i} className="flex gap-2"><span className="text-primary">→</span><span>“{s}”</span></li>)}</ul></div>
          <div><h4 className="font-semibold text-sm flex items-center gap-2"><HelpCircle className="h-4 w-4"/>3 to ask</h4><ul className="mt-2 space-y-2 text-sm">{quickAsk.map((a:string,i:number)=><li key={i} className="flex gap-2"><span className="text-primary">•</span><span>{a}</span></li>)}</ul></div>
          <div><h4 className="font-semibold text-sm flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4"/>1 to avoid</h4><p className="mt-2 text-sm text-destructive bg-destructive/5 p-3 rounded-lg border border-destructive/20">{quickAvoid}</p></div>
        </CardContent>
      </Card>

      {/* TL;DR */}
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500"/>TL;DR</CardTitle></CardHeader><CardContent><ol className="space-y-3">{tldr.map((t:string,i:number)=><li key={i} className="flex gap-3 text-[15px] leading-relaxed"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">{i+1}</span><span>{t}</span></li>)}</ol></CardContent></Card>

      {/* Common Ground + Why This Matters */}
      {(brief as any).commonGround?.length ? <Card className="border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-950/20"><CardHeader><CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100"><Users className="h-5 w-5 text-green-600"/>Common Ground</CardTitle></CardHeader><CardContent><ul className="space-y-2 text-sm">{(brief as any).commonGround.map((g:string,i:number)=><li key={i} className="flex gap-2"><span className="text-green-600">✓</span><span>{g}</span></li>)}</ul></CardContent></Card> : null}
      {meeting.hostName ? <Card><CardContent className="pt-6"><p className="text-sm"><span className="font-medium">Host:</span> {meeting.hostName} {meeting.hostEmail? `· ${meeting.hostEmail}`:""} <Badge variant="outline" className="ml-2">You</Badge></p><p className="text-xs text-muted-foreground mt-1">Host context excluded from external research — common ground computed against host.</p></CardContent></Card> : null}

      {/* Attendees */}
      <section aria-labelledby="attendees"><h2 id="attendees" className="font-display text-heading-lg font-semibold flex items-center gap-2 mb-4"><Users className="h-5 w-5 text-primary"/>Who's in the Room <Badge variant="outline">{attendees.length}</Badge></h2><div className="grid gap-4">{attendees.map((a:any,i:number)=><AttendeeCard key={i} a={a}/>)}{attendees.length===0 && <p className="text-muted-foreground text-sm">No attendee profiles.</p>}</div></section>
      <Separator/>

      {/* Companies */}
      {companies.length>0 && <section aria-labelledby="companies"><h2 id="companies" className="font-display text-heading-lg font-semibold flex items-center gap-2 mb-4"><Building2 className="h-5 w-5 text-primary"/>Company Context</h2><div className="grid gap-4">{companies.map((c:any,i:number)=><Card key={i}><CardContent className="pt-6"><h4 className="font-semibold">{c.summary?.split('.')[0] || "Overview"}</h4><p className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.summary}</p>{c.insights && <p className="text-sm text-primary mt-3 font-medium bg-primary/5 p-3 rounded-lg">{c.insights}</p>}<SourceChips sources={c.sources||[]} /></CardContent></Card>)}</div></section>}

      {/* Topics */}
      {topics.length>0 && <section aria-labelledby="topics"><h2 id="topics" className="font-display text-heading-lg font-semibold flex items-center gap-2 mb-4"><FileText className="h-5 w-5 text-primary"/>Topic Brief</h2><div className="space-y-4">{topics.map((t:any,i:number)=><Card key={i}><CardContent className="pt-6"><h4 className="font-semibold text-base">{t.topic}</h4><div className="mt-3 space-y-3 text-sm leading-relaxed"><p><span className="font-medium text-muted-foreground">Context:</span> {t.context}</p><p><span className="font-medium text-muted-foreground">Recent:</span> {t.recentDevelopments}</p><p><span className="font-medium">Why it matters:</span> {t.whyItMatters}</p><div className="rounded-lg bg-primary/5 border border-primary/10 p-3"><span className="font-medium text-primary">Discussion angle:</span> {t.discussionAngle}</div></div><SourceChips sources={t.sources||[]}/></CardContent></Card>)}</div></section>}

      {/* Talking Points */}
      <section aria-labelledby="talking"><h2 id="talking" className="font-display text-heading-lg font-semibold flex items-center gap-2 mb-4"><Lightbulb className="h-5 w-5 text-primary"/>Talking Points</h2><div className="grid gap-4 sm:grid-cols-2">
        <TalkCard title="High Priority" icon={AlertTriangle} items={tps.highPriority||[]} color="destructive"/>
        <TalkCard title="Opportunities" icon={Lightbulb} items={tps.opportunity||[]} color="success"/>
        <TalkCard title="Questions to Ask" icon={HelpCircle} items={tps.questions||[]} color="primary"/>
        <TalkCard title="Follow-up" icon={MessageSquare} items={tps.followUp||[]} color="muted"/>
      </div></section>

      {/* Starters */}
      <section aria-labelledby="starters"><h2 id="starters" className="font-display text-heading-lg font-semibold flex items-center gap-2 mb-4"><MessageSquare className="h-5 w-5 text-primary"/>Conversation Starters <Badge variant="outline">{starters.length}</Badge></h2><div className="space-y-3">{starters.map((s:any,i:number)=><Card key={i} className="hover:border-primary/20 transition-colors"><CardContent className="pt-5"><div className="flex gap-3"><span className="text-primary font-bold text-lg leading-none">{i+1}</span><div className="flex-1"><p className="text-[15px] leading-relaxed">“{s.text}”</p><p className="text-xs text-muted-foreground mt-2">{s.context}</p>{s.attendee && <Badge variant="outline" className="mt-2 gap-1"><Users className="h-3 w-3"/>{s.attendee}</Badge>}</div></div></CardContent></Card>)}</div></section>

      {/* Questions */}
      {questions.length>0 && <section><h2 className="font-display text-heading-lg font-semibold flex items-center gap-2 mb-4"><HelpCircle className="h-5 w-5 text-primary"/>Questions to Ask</h2><div className="space-y-3">{questions.map((q:string,i:number)=><Card key={i}><CardContent className="pt-4 flex gap-3"><HelpCircle className="h-5 w-5 text-primary mt-0.5 shrink-0"/><p className="text-sm leading-relaxed">{q}</p></CardContent></Card>)}</div></section>}

      {/* Watch outs */}
      {watch.length>0 && <section><h2 className="font-display text-heading-lg font-semibold flex items-center gap-2 mb-4 text-destructive"><AlertTriangle className="h-5 w-5"/>Watch Out For</h2><div className="space-y-3">{watch.map((w:string,i:number)=><Card key={i} className="border-destructive/20 bg-destructive/5"><CardContent className="pt-4 flex gap-3"><AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0"/><p className="text-sm text-destructive leading-relaxed">{w}</p></CardContent></Card>)}</div></section>}

      {/* Sources */}
      {sources.length>0 && <Card><CardHeader><CardTitle className="flex items-center gap-2"><ExternalLink className="h-5 w-5"/>Sources <Badge variant="outline">{sources.length}</Badge></CardTitle></CardHeader><CardContent><div className="space-y-2 max-h-[320px] overflow-auto pr-2">{sources.map((s:any,i:number)=><a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border transition-colors group"><Badge variant={s.credibility==='high'?"default": s.credibility==='medium'?"secondary":"outline"} className="shrink-0">{s.credibility}</Badge><span className="flex-1 text-sm font-medium group-hover:text-primary group-hover:underline line-clamp-2">{s.title}<ExternalLink className="inline h-3 w-3 ml-1 opacity-60"/></span><Badge variant="outline" className="shrink-0 hidden sm:inline-flex">{s.type}</Badge></a>)}</div></CardContent></Card>}
    </div>
  )
}
function MiniCard({title, icon:Icon, items}:{title:string; icon:any; items:string[]}){ return <Card><CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4 text-primary"/>{title}</CardTitle></CardHeader><CardContent><ul className="space-y-2 text-sm">{items.map((x,i)=><li key={i} className="flex gap-2"><span className="text-primary">•</span><span>{x}</span></li>)}{items.length===0 && <li className="text-muted-foreground">No items</li>}</ul></CardContent></Card>}
function BlockWalk({title, items, color}:{title:string; items:string[]; color:string}){ return <div><p className={cn("text-xs font-mono tracking-widest",color)}>{title}</p><ul className="mt-2 space-y-2">{items.map((x,i)=><li key={i} className="text-lg font-medium leading-snug">{x}</li>)}</ul></div>}
function AttendeeCard({a}:{a:any}){ const [open,setOpen]=useState(false); const evidence=(a.evidence||[]) as any[]; const github=a.github||a.githubUsername; return <Card className="overflow-hidden"><CardContent className="pt-6"><div className="flex gap-4"><Avatar className="h-12 w-12 shrink-0"><AvatarFallback>{getInitials(a.name)}</AvatarFallback></Avatar><div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">{a.name}</h4><Badge variant={a.confidence==='verified'?"default": a.confidence==='inferred'?"secondary":"outline"}>{a.confidence||"inferred"}</Badge>{a.company && <Badge variant="outline">{a.company}</Badge>}{github && <Badge variant="outline" className="gap-1">GitHub ✓</Badge>}{a.linkedinVerified && <Badge variant="outline" className="gap-1">LinkedIn ✓</Badge>}</div><p className="text-sm text-muted-foreground">{a.role} {a.company? `· ${a.company}`:""} {github? `· ${github}`:""}</p><p className="text-sm mt-2 leading-relaxed">{a.relevantBackground}</p><div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3"><p className="text-xs font-mono tracking-widest text-amber-700 dark:text-amber-300">WHY THIS MATTERS</p><p className="text-sm mt-1 font-medium">{a.whyTheyMatter}</p></div>{evidence.length>0 && <div className="mt-3 space-y-1">{evidence.slice(0,2).map((ev:any,i:number)=><div key={i} className="text-xs p-2 rounded-lg bg-muted/50 border border-border"><p className="font-medium">{ev.fact}</p><p className="text-muted-foreground mt-1">Source: {ev.sourceType||"web"} · {ev.sourceUrl?.slice(0,40)} {ev.confidence? `· ${ev.confidence}`:""}</p></div>)}</div>}<Button variant="ghost" size="sm" className="mt-2 h-7 px-2" onClick={()=>setOpen(!open)}>{open?"Hide":"Show"} context <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform",open&&"rotate-180")}/></Button>{open && <div className="mt-3 text-sm space-y-2 animate-fade-in"><Separator/><SourceChips sources={a.sources||[]}/>{a.githubSnapshot && <div className="rounded-lg border border-border p-3 bg-muted/30"><p className="text-xs font-medium">GitHub Context</p><p className="text-xs text-muted-foreground mt-1">{(a.githubSnapshot.user?.bio||"Open source contributor")} · {(a.githubSnapshot.languages||[]).slice(0,3).map((l:any)=>l.name).join(", ")} {a.githubSnapshot.publicRepos? `${a.githubSnapshot.publicRepos} repos`:""} {a.githubSnapshot.commits90d? `${a.githubSnapshot.commits90d} commits 90d`:""}</p></div>}</div>}</div></div></CardContent></Card>}
function TalkCard({title, icon:Icon, items, color}:{title:string; icon:any; items:string[]; color:string}){ if(!items.length) return null; return <Card className={cn(color==="destructive" && "border-destructive/20 bg-destructive/5", color==="success" && "border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-950/20")}><CardContent className="pt-5"><h4 className="font-semibold flex items-center gap-2"><Icon className={cn("h-5 w-5", color==="destructive"?"text-destructive": color==="success"?"text-green-600": color==="primary"?"text-primary":"text-muted-foreground")}/>{title}</h4><ul className="mt-3 space-y-2 text-sm">{items.map((x:string,i:number)=><li key={i} className="flex gap-2"><span className="text-muted-foreground">•</span><span>{x}</span></li>)}</ul></CardContent></Card>}
function SourceChips({sources}:{sources:any[]}){ if(!sources?.length) return null; return <div className="mt-3 flex flex-wrap gap-2">{sources.slice(0,4).map((s:any,i:number)=><a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs hover:bg-muted transition-colors"><span className="truncate max-w-[150px]">{s.title}</span><ExternalLink className="h-3 w-3 opacity-60"/></a>)}{sources.length>4 && <Badge variant="outline" className="text-xs">+{sources.length-4} more</Badge>}</div>}
