export type StreamEvent =
  | { type: 'stage'; stage: string; status: 'running' | 'done' | 'error'; message?: string; progress?: number }
  | { type: 'meeting'; data: any }
  | { type: 'attendee'; attendeeId: string; status: 'resolving' | 'ready' | 'cached' | 'error'; data?: any; message?: string }
  | { type: 'evidence'; attendeeId?: string; company?: string; data: any }
  | { type: 'brief_section'; section: string; data: any }
  | { type: 'brief'; data: any }
  | { type: 'complete'; data?: any }
  | { type: 'error'; message: string }

export function encodeNDJSON(event: StreamEvent): string {
  return JSON.stringify(event) + '\n'
}

export async function* parseNDJSON(stream: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim()
        buffer = buffer.slice(idx + 1)
        if (!line) continue
        try {
          yield JSON.parse(line) as StreamEvent
        } catch {
          // ignore malformed line
        }
      }
    }
    if (buffer.trim()) {
      try { yield JSON.parse(buffer.trim()) as StreamEvent } catch {}
    }
  } finally {
    reader.releaseLock()
  }
}