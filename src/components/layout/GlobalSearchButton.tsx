"use client"
import { useEffect, useRef, useState, useMemo } from "react"
import Link from "next/link"
import { Search, Users, Building2, Calendar, FileText, Loader2, AlertCircle, X } from "lucide-react"

interface SearchData {
  meetings: Array<{ id: string; title: string; dateTime: string; status: string; hostName: string | null; attendees: Array<{ name: string; company: string | null; role: string | null }> }>
  people: Array<{ id: string; name: string; role: string | null; company: string | null; meetingId: string; meetingTitle: string }>
  topics: Array<{ id: string; meetingId: string; meetingTitle: string; snippet: string; dateTime: string }>
}

export function GlobalSearchButton(){
  const [open,setOpen]=useState(false)
  const [q,setQ]=useState("")
  const [results,setResults]=useState<SearchData>({meetings:[], people:[], topics:[]})
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState<string|null>(null)
  const [selected, setSelected]=useState(0)
  const abortRef=useRef<AbortController | null>(null)
  const inputRef=useRef<HTMLInputElement>(null)
  const listRef=useRef<HTMLDivElement>(null)

  const flat = useMemo(()=>{
    const a: Array<{key:string; href:string; label:string}> = []
    results.meetings.forEach(m=> a.push({key:`m-${m.id}`, href:`/meetings/${m.id}`, label:m.title}))
    results.people.forEach(p=> a.push({key:`p-${p.id}`, href:`/meetings/${p.meetingId}`, label:p.name}))
    results.topics.forEach(t=> a.push({key:`t-${t.id}`, href:`/meetings/${t.meetingId}`, label:t.meetingTitle}))
    return a
  }, [results])

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if((e.metaKey||e.ctrlKey) && e.key==="k"){ e.preventDefault(); setOpen(true)}
      if(e.key==="Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey); return()=>window.removeEventListener("keydown", onKey)
  },[])

  useEffect(()=>{
    if(open) setTimeout(()=> inputRef.current?.focus(), 50)
    if(!open){ setQ(""); setResults({meetings:[], people:[], topics:[]}); setError(null); setLoading(false); abortRef.current?.abort(); setSelected(0) }
  },[open])

  useEffect(()=>{ setSelected(0) }, [q, results])

  useEffect(()=>{
    const trimmed = q.trim()
    if(!open || !trimmed){
      setResults({meetings:[], people:[], topics:[]})
      setError(null)
      setLoading(false)
      abortRef.current?.abort()
      return
    }
    if(trimmed.length <1 || trimmed.length>100){
      setError(trimmed.length>100 ? "Query must be 1-100 characters" : null)
      return
    }
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setError(null)
    const t=setTimeout(async()=>{
      try{
        const r=await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: ctrl.signal })
        const d=await r.json()
        if(ctrl.signal.aborted) return
        if(!r.ok){
          if(r.status===429) setError("Too many searches — please wait a moment")
          else setError(d.error || "Search failed")
          setResults({meetings:[], people:[], topics:[]})
        } else if(d.success){
          setResults({ meetings: d.data.meetings ?? [], people: d.data.people ?? [], topics: d.data.topics ?? [] })
        } else {
          setError(d.error || "Search failed")
        }
      }catch(e:any){
        if(e?.name==="AbortError") return
        setError("Search failed")
      }finally{
        if(!ctrl.signal.aborted) setLoading(false)
      }
    },250)
    return()=>{ clearTimeout(t); ctrl.abort() }
  },[q, open])

  const hasResults = results.meetings.length>0 || results.people.length>0 || results.topics.length>0
  const empty = q.trim() && !loading && !error && !hasResults

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>)=>{
    if(e.key==="ArrowDown"){ e.preventDefault(); setSelected(s=> Math.min(s+1, flat.length-1)) }
    else if(e.key==="ArrowUp"){ e.preventDefault(); setSelected(s=> Math.max(s-1, 0)) }
    else if(e.key==="Enter"){
      const item = flat[selected]
      if(item){ window.location.href = item.href; setOpen(false) }
    }
  }

  // scroll selected into view
  useEffect(()=>{
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [selected])

  let flatIdx = -1

  return (
    <>
      <button onClick={()=>setOpen(true)} aria-label="Search meetings, people, topics" className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
        <Search className="h-4 w-4"/><span className="hidden lg:inline">Search</span><kbd className="hidden lg:inline-flex ml-2 rounded border bg-background px-1.5 py-0.5 text-xs">⌘K</kbd>
      </button>
      <button onClick={()=>setOpen(true)} aria-label="Search" className="sm:hidden p-2 rounded-lg border border-border hover:bg-accent"><Search className="h-4 w-4"/></button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] sm:pt-[20vh] bg-background/60 backdrop-blur-sm p-4" onClick={()=>setOpen(false)}>
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-scale-in" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <Search className="h-5 w-5 text-muted-foreground shrink-0"/>
              <input
                ref={inputRef}
                autoFocus
                value={q}
                onChange={e=>setQ(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search meetings, people, companies..."
                maxLength={100}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                aria-label="Search input"
                aria-activedescendant={flat[selected] ? `result-${flat[selected].key}` : undefined}
              />
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/> : q ? (
                <button onClick={()=>setQ("")} className="p-1 rounded hover:bg-muted" aria-label="Clear search"><X className="h-4 w-4"/></button>
              ) : null}
              <kbd className="hidden sm:inline-flex rounded border bg-muted px-1.5 py-0.5 text-xs">ESC</kbd>
            </div>
            <div ref={listRef} className="max-h-[60vh] overflow-auto p-2">
              {error && (
                <div className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/5 rounded-xl m-1">
                  <AlertCircle className="h-4 w-4 shrink-0"/>{error}
                </div>
              )}
              {!q.trim() && !error && (
                <div className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">Type to search</p>
                  <p className="text-xs text-muted-foreground mt-1">Meetings · People · Topics</p>
                  <div className="flex justify-center gap-2 mt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3"/>Meetings</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3"/>People</span>
                    <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3"/>Topics</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">↑↓ navigate · Enter to open · Esc to close</p>
                </div>
              )}
              {loading && q.trim() && <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/></div>}
              {empty && (
                <p className="p-6 text-center text-sm text-muted-foreground">No results for &quot;{q.trim()}&quot;</p>
              )}
              {hasResults && !loading && (
                <div className="space-y-4 py-1">
                  {results.meetings.length>0 && (
                    <div>
                      <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Calendar className="h-3 w-3"/> Meetings · {results.meetings.length}</p>
                      <div className="space-y-1">
                        {results.meetings.map(m=>{
                          flatIdx++
                          const idx=flatIdx
                          const isSel = idx===selected
                          return (
                          <Link id={`result-m-${m.id}`} data-idx={idx} key={m.id} href={`/meetings/${m.id}`} onClick={()=>setOpen(false)} onMouseEnter={()=>setSelected(idx)} className={`flex gap-3 p-3 rounded-xl transition-colors ${isSel ? "bg-muted ring-1 ring-border" : "hover:bg-muted"}`}>
                            <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0"/>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{m.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{new Date(m.dateTime).toLocaleString()} · {m.attendees.length} attendees · {m.status}</p>
                            </div>
                          </Link>
                        )})}
                      </div>
                    </div>
                  )}
                  {results.people.length>0 && (
                    <div>
                      <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Users className="h-3 w-3"/> People · {results.people.length}</p>
                      <div className="space-y-1">
                        {results.people.map(p=>{
                          flatIdx++
                          const idx=flatIdx
                          const isSel = idx===selected
                          return (
                          <Link id={`result-p-${p.id}`} data-idx={idx} key={p.id} href={`/meetings/${p.meetingId}`} onClick={()=>setOpen(false)} onMouseEnter={()=>setSelected(idx)} className={`flex gap-3 p-3 rounded-xl transition-colors ${isSel ? "bg-muted ring-1 ring-border" : "hover:bg-muted"}`}>
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">{p.name.slice(0,2).toUpperCase()}</div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{p.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{p.role ? `${p.role}` : ""}{p.company ? ` · ${p.company}` : ""} · in {p.meetingTitle}</p>
                            </div>
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-1"/>
                          </Link>
                        )})}
                      </div>
                    </div>
                  )}
                  {results.topics.length>0 && (
                    <div>
                      <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><FileText className="h-3 w-3"/> Topics · {results.topics.length}</p>
                      <div className="space-y-1">
                        {results.topics.map(t=>{
                          flatIdx++
                          const idx=flatIdx
                          const isSel = idx===selected
                          return (
                          <Link id={`result-t-${t.id}`} data-idx={idx} key={t.id} href={`/meetings/${t.meetingId}`} onClick={()=>setOpen(false)} onMouseEnter={()=>setSelected(idx)} className={`flex gap-3 p-3 rounded-xl transition-colors ${isSel ? "bg-muted ring-1 ring-border" : "hover:bg-muted"}`}>
                            <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0"/>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{t.meetingTitle}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{t.snippet || "Topic match in agenda/description"}</p>
                            </div>
                          </Link>
                        )})}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Max 5 per category · Ordered by date</span>
              <span className="hidden sm:inline">↑↓ navigate · Enter open · ⌘K to open · ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}