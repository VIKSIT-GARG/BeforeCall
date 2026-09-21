import { meetingCreateSchema } from "@/lib/validations/meeting";
import { checkRateLimit, resetRateLimitStore } from "@/lib/rate-limit";
import { stripHtml, sanitizeString, sanitizeUrl, sanitizeAttendeeInput, isValidUrl } from "@/lib/sanitize";
import { validateAndNormalizeResults, truncateSnippet, normalizeQuery } from "@/lib/tavily-guardrails";


function req(ip="1.1.1.1"){ return { headers:{ get:(k:string)=> k.toLowerCase()==="x-forwarded-for"? ip : null } } as any }

describe("API Contract & Validation", () => {
  test("meetingCreateSchema accepts valid", () => {
    const r = meetingCreateSchema.safeParse({
      title:"Acme Sync", dateTime: new Date().toISOString(), duration:60,
      attendees:[{name:"Jane Doe", email:"jane@acme.ai", role:"VP", company:"Acme"}]
    })
    expect(r.success).toBe(true)
  })
  test("rejects empty title", ()=> expect(meetingCreateSchema.safeParse({title:"", dateTime:new Date().toISOString(), attendees:[{name:"A"}]}).success).toBe(false))
  test("rejects 0 attendees", ()=> expect(meetingCreateSchema.safeParse({title:"T", dateTime:new Date().toISOString(), attendees:[]}).success).toBe(false))
  test("rejects 11 attendees", ()=> {
    const attendees = Array.from({length:11}, (_,i)=> ({name:`Person ${i}`}))
    expect(meetingCreateSchema.safeParse({title:"T", dateTime:new Date().toISOString(), attendees}).success).toBe(false)
  })
  test("rejects long title 201", ()=> expect(meetingCreateSchema.safeParse({title:"a".repeat(201), dateTime:new Date().toISOString(), attendees:[{name:"A"}]}).success).toBe(false))
  test("rejects bad email", ()=> expect(meetingCreateSchema.safeParse({title:"T", dateTime:new Date().toISOString(), attendees:[{name:"A", email:"bad"}]}).success).toBe(false))
  test("rejects invalid duration", ()=> expect(meetingCreateSchema.safeParse({title:"T", dateTime:new Date().toISOString(), duration: 5, attendees:[{name:"A"}]}).success).toBe(false))
  test("rejects huge agenda", ()=> expect(meetingCreateSchema.safeParse({title:"T", dateTime:new Date().toISOString(), agenda:"a".repeat(5001), attendees:[{name:"A"}]}).success).toBe(false))
  test("accepts valid URL, rejects javascript:", ()=>{
    expect(meetingCreateSchema.safeParse({title:"T", dateTime:new Date().toISOString(), meetingUrl:"https://zoom.us/j/123", attendees:[{name:"A"}]}).success).toBe(true)
    expect(meetingCreateSchema.safeParse({title:"T", dateTime:new Date().toISOString(), meetingUrl:"javascript:alert(1)", attendees:[{name:"A"}]}).success).toBe(false)
  })
})

describe("Rate limiting", () => {
  beforeEach(()=> resetRateLimitStore())
  test("research 10/min then 11th blocked", ()=>{
    const ip="1.1.1.1"
    for(let i=0;i<10;i++) expect(checkRateLimit(req(ip),"research").allowed).toBe(true)
    const r=checkRateLimit(req(ip),"research")
    expect(r.allowed).toBe(false)
    expect(r.retryAfterMs).toBeGreaterThan(0)
  })
  test("meetings 30/min", ()=>{
    const ip="2.2.2.2"
    for(let i=0;i<30;i++) expect(checkRateLimit(req(ip),"meetings").allowed).toBe(true)
    expect(checkRateLimit(req(ip),"meetings").allowed).toBe(false)
  })
  test("per-IP isolation", ()=>{
    for(let i=0;i<10;i++) checkRateLimit(req("3.3.3.3"),"research")
    expect(checkRateLimit(req("9.9.9.9"),"research").allowed).toBe(true)
  })
})

describe("Sanitization & Security", () => {
  test("stripHtml removes tags and js", ()=>{
    expect(stripHtml('<script>alert(1)</script>hello')).toContain('hello')
    expect(stripHtml('<script>alert(1)</script>hello')).not.toContain('<script')
    expect(stripHtml('javascript:alert(1)')).not.toContain('javascript:')
  })
  test("sanitizeString truncates and collapses", ()=>{
    expect(sanitizeString("  hello   world  ",10).length).toBeLessThanOrEqual(10)
    expect(sanitizeString("a\n\nb",100)).toContain("a")
  })
  test("isValidUrl & sanitizeUrl", ()=>{
    expect(isValidUrl("https://example.com")).toBe(true)
    expect(isValidUrl("javascript:alert")).toBe(false)
    expect(sanitizeUrl("https://zoom.us/j/123")).toBe("https://zoom.us/j/123")
    expect(sanitizeUrl("javascript:alert")).toBeNull()
  })
  test("sanitizeAttendeeInput strips XSS", ()=>{
    const a = sanitizeAttendeeInput({name: '<img src=x onerror=alert(1)>Jane', notes:'<b>hi</b>'} as any)
    expect(a.name).not.toContain('<')
    expect(a.notes).toBe('hi')
  })
})

describe("Tavily guardrails", () => {
  test("normalizeQuery trims and lowercases", ()=>{
    expect((normalizeQuery("  Acme AI  ")||"").trim()).toBe("Acme AI")
    expect((normalizeQuery("a".repeat(300)) || "").length).toBeLessThanOrEqual(200)
    expect(normalizeQuery("   ") || "").toBe("")
  })
  test("validateAndNormalizeResults filters malformed", ()=>{
    const r = validateAndNormalizeResults({results:[
      {title:"t", url:"https://a.com", content:"ok", score:1} as any,
      {url:"", title:"", content:""} as any,
      {title:"dup", url:"https://a.com", content:"again", score:1} as any,
      {title:"big", url:"https://b.com", content:"x".repeat(5000), score:1} as any,
    ]} as any)
    expect(r.length).toBe(2)
    const b: any = (r as any).find((x: any)=> x.url==="https://b.com")
    expect(b).toBeDefined()
    expect((b.content ?? '').length).toBeLessThanOrEqual(600)
  })
  test("truncateSnippet caps", ()=>{
    expect(truncateSnippet("a".repeat(1000)).length).toBeLessThanOrEqual(600)
  })
})

describe("Failure matrix", () => {
  test("rate limit blocks duplicate research", ()=>{
    resetRateLimitStore()
    const ip="10.0.0.1"
    for(let i=0;i<10;i++) checkRateLimit(req(ip),"research")
    expect(checkRateLimit(req(ip),"research").allowed).toBe(false)
  })
  test("empty Tavily results handled gracefully", ()=>{
    expect(validateAndNormalizeResults({results:[]})).toEqual([])
  })
})