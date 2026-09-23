"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, Loader2, ExternalLink } from "lucide-react"

const SUGGESTED = [
  "What should I ask first?",
  "What's our common ground?",
  "What is the biggest thing I should know?",
  "Give me a 30-second briefing.",
  "Why is Sarah relevant to this meeting?",
  "What should I avoid asking?",
]

export function MeetingChat({ meetingId, briefReady }: { meetingId: string; briefReady: boolean }) {
  const [messages, setMessages] = useState<Array<{role:'user'|'assistant', content:string, sources?: any[]}>>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const send = async (text?: string) => {
    const q = (text ?? input).trim()
    if (!q || loading) return
    if (!briefReady) { setError("Brief not ready — run research first"); return }
    setError("")
    setInput("")
    const newMsgs: typeof messages = [...messages, { role: 'user' as const, content: q }]
    setMessages(newMsgs)
    // placeholder for streaming assistant message
    const assistantIdx = newMsgs.length
    setMessages(prev => [...prev, { role: 'assistant', content: "" }])
    setLoading(true)
    try {
      // Prefer streaming (fast first token) — fallback to JSON
      const res = await fetch(`/api/chat/${meetingId}?stream=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({ message: q, history: newMsgs.slice(-6), stream: true }),
      })
      const contentType = res.headers.get('content-type') || ''
      if (res.ok && contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let acc = ''
        let sources: any[] | undefined
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() || ''
          for (const part of parts) {
            const lines = part.split('\n')
            for (const line of lines) {
              if (!line.startsWith('data:')) continue
              const data = line.slice(5).trim()
              if (!data) continue
              try {
                const json = JSON.parse(data)
                if (json.token) {
                  acc += json.token
                  setMessages(prev => {
                    const copy = [...prev]
                    copy[assistantIdx] = { role: 'assistant', content: acc, sources }
                    return copy
                  })
                }
                if (json.done) {
                  sources = json.sources
                  setMessages(prev => {
                    const copy = [...prev]
                    copy[assistantIdx] = { role: 'assistant', content: acc, sources }
                    return copy
                  })
                }
                if (json.error) throw new Error(json.error)
              } catch {}
            }
          }
        }
        if (!acc) {
          throw new Error('No answer received from assistant')
        }
      } else {
        // Non-stream JSON
        const d = await res.json()
        if (!d.success) throw new Error(d.error || 'Chat failed')
        setMessages(prev => {
          const copy = [...prev]
          copy[assistantIdx] = { role: 'assistant', content: d.data.answer, sources: d.data.sources }
          return copy
        })
      }
    } catch (e: any) {
      setError(e.message || 'Chat failed')
      setMessages(prev => {
        const copy = [...prev]
        // replace placeholder with error
        if (copy[assistantIdx]?.content === "") {
          copy[assistantIdx] = { role: 'assistant', content: 'Could not answer — please try again. Evidence may be limited for this question.' }
        } else {
          copy.push({ role: 'assistant', content: 'Could not answer — please try again. Evidence may be limited for this question.' })
        }
        return copy
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-foreground overflow-hidden">
      <CardHeader className="border-b border-foreground bg-card pb-3">
        <CardTitle className="font-mono text-xs tracking-[0.14em] uppercase flex items-center gap-2">
          <span className="h-2 w-2 bg-[hsl(var(--accent-yellow))] border border-foreground" aria-hidden="true" />
          Meeting Assistant
          <Badge variant="outline" className="ml-auto font-mono text-[10px]">Meeting-scoped</Badge>
        </CardTitle>
        <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-muted-foreground">Ask anything about this meeting — answers stay within current context</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.slice(0,4).map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={loading || !briefReady}
              className="rounded-full border border-foreground bg-background px-3 py-1.5 font-mono text-[11px] tracking-[0.06em] hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-3 max-h-[320px] overflow-auto pr-1">
          {messages.length === 0 && (
            <div className="rounded-lg border border-dashed border-foreground/30 bg-muted/20 p-4 text-center">
              <p className="font-mono text-xs tracking-[0.08em] uppercase text-muted-foreground">Example</p>
              <p className="text-sm mt-1">“What does Sarah's background suggest we should discuss?”</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`rounded-lg border p-3 ${m.role==='user' ? 'border-foreground bg-foreground text-background ml-8' : 'border-foreground bg-card mr-8'}`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
              {m.sources?.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.sources.slice(0,3).map((s:any, j:number)=>(
                    <a key={j} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex gap-1 rounded-full border border-foreground/30 bg-background px-2 py-1 font-mono text-[10px] hover:bg-muted">
                      {s.title.slice(0,30)} <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {loading && <div className="flex gap-2 items-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Thinking…</div>}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <form onSubmit={e=>{e.preventDefault(); send()}} className="flex gap-2">
          <input
            value={input}
            onChange={e=>setInput(e.target.value)}
            placeholder={briefReady ? "What should I ask Sarah?" : "Run research to enable chat"}
            disabled={!briefReady || loading}
            maxLength={2000}
            className="flex-1 rounded-lg border border-foreground bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
            aria-label="Ask meeting assistant"
          />
          <Button type="submit" disabled={!input.trim() || loading || !briefReady} className="bg-foreground text-background hover:bg-background hover:text-foreground border border-foreground">
            {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
            <span className="hidden sm:inline ml-2 font-mono text-xs tracking-[0.1em] uppercase">Send</span>
          </Button>
        </form>
        <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-muted-foreground text-center">
          Scoped to current meeting · Cached context · No pipeline rerun
        </p>
      </CardContent>
    </Card>
  )
}