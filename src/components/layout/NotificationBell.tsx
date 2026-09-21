"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import { Bell, CheckCheck, Loader2, AlertCircle, FileText, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface N { id:string; title:string; message:string; read:boolean; createdAt:string; meetingId?:string | null; type: string }

export function NotificationBell(){
  const [items,setItems]=useState<N[]>([])
  const [open,setOpen]=useState(false)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState<string|null>(null)
  const containerRef=useRef<HTMLDivElement>(null)

  const unread=items.filter(i=>!i.read).length

  const fetchNotifs=useCallback(async()=>{
    try{
      setError(null)
      const r=await fetch("/api/notifications", { cache: "no-store" })
      const d=await r.json()
      if(!r.ok){
        if(r.status===429) setError("Rate limited — retry shortly")
        else setError(d.error || "Failed to load")
        return
      }
      if(d.success && Array.isArray(d.data)) setItems(d.data)
    }catch(e){
      setError("Failed to load")
    }
  },[])

  useEffect(()=>{
    fetchNotifs()
    const id=setInterval(fetchNotifs,15000)
    return()=>clearInterval(id)
  },[fetchNotifs])

  // Close on outside click
  useEffect(()=>{
    if(!open) return
    const onDown=(e:MouseEvent)=>{
      if(containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc=(e:KeyboardEvent)=>{ if(e.key==="Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onEsc)
    return()=>{ document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onEsc)}
  },[open])

  const markAll=async()=>{
    if(unread===0) return
    const prev=[...items]
    setItems(p=>p.map(x=>({...x, read:true})))
    try{
      const r=await fetch("/api/notifications",{method:"PATCH"})
      if(!r.ok) setItems(prev)
      else fetchNotifs()
    }catch{
      setItems(prev)
    }
  }

  const typeIcon=(t:string)=>{
    switch(t){
      case "research_complete": return <FileText className="h-3.5 w-3.5 text-green-600"/>
      case "research_failed": return <AlertCircle className="h-3.5 w-3.5 text-destructive"/>
      case "meeting_reminder": return <Clock className="h-3.5 w-3.5 text-primary"/>
      default: return <Bell className="h-3.5 w-3.5 text-muted-foreground"/>
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={()=>setOpen(o=>!o)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent relative transition-colors" aria-label={`Notifications${unread?` (${unread} unread)`:""}`} aria-expanded={open}>
        <Bell className="h-5 w-5"/>
        {unread>0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground flex items-center justify-center leading-none">
            {unread>9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden animate-slide-in-from-top">
          <div className="p-3 flex items-center justify-between border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">Notifications</p>
              {unread>0 && <span className="rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5">{unread} new</span>}
            </div>
            <button onClick={markAll} disabled={unread===0} className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline">
              <CheckCheck className="h-3.5 w-3.5"/>Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-auto">
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/></div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-sm text-destructive">{error}</p>
                <button onClick={fetchNotifs} className="text-xs text-primary hover:underline mt-2">Retry</button>
              </div>
            ) : items.length===0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2"><Bell className="h-5 w-5 text-muted-foreground"/></div>
                <p className="text-sm text-muted-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground mt-1">You&apos;ll see research updates and meeting reminders here</p>
              </div>
            ) : items.map(n=>(
              <div key={n.id} className={`p-3 border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${!n.read ? "bg-primary/5":""}`}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">{typeIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight truncate">{n.title}</p>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" aria-label="Unread"/>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.createdAt), { addSuffix:true })}</p>
                      {n.meetingId && (
                        <Link href={`/meetings/${n.meetingId}`} onClick={()=>setOpen(false)} className="text-xs text-primary hover:underline">View meeting →</Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-border bg-muted/20 text-center">
            <p className="text-xs text-muted-foreground">Polls every 15s · Last {items.length} notifications</p>
          </div>
        </div>
      )}
    </div>
  )
}
