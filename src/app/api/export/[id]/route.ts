import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseMaybeJson(v: any) {
  if (!v) return null;
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return v; } }
  return v;
}
function isValidId(id: string) { return /^[a-z0-9_-]+$/i.test(id) && id.length <= 128; }

function toMarkdown(meeting: any, brief: any) {
  const tldr = parseMaybeJson(brief.tldr) || [];
  const attendees = parseMaybeJson(brief.attendeeSummaries) || [];
  const companies = parseMaybeJson(brief.companyContext) || [];
  const topics = parseMaybeJson(brief.topicBriefs) || [];
  const starters = parseMaybeJson(brief.conversationStarters) || [];
  const tps = parseMaybeJson(brief.talkingPoints) || {};
  const questions = parseMaybeJson(brief.questions) || [];
  const watch = parseMaybeJson(brief.watchOuts) || [];
  const sources = parseMaybeJson(brief.sources) || [];
  const lines: string[] = [];
  lines.push(`# ${meeting.title}`);
  lines.push(`*${new Date(meeting.dateTime).toLocaleString()} · ${meeting.duration ?? 60} min*`);
  if (meeting.attendees?.length) lines.push(`\n**Attendees:** ${meeting.attendees.map((a:any)=> `${a.name}${a.role?` (${a.role})`:""}${a.company?` @ ${a.company}`:""}`).join(", ")}`);
  lines.push(`\n---\n## TL;DR`);
  tldr.forEach((t:string)=> lines.push(`- ${t}`));
  if (attendees.length) { lines.push(`\n## Who's in the Room`); attendees.forEach((a:any)=> lines.push(`**${a.name}** — ${a.role} @ ${a.company}\n${a.relevantBackground}\n> ${a.whyTheyMatter} *(${a.confidence})*`)); }
  if (companies.length) { lines.push(`\n## Company Context`); companies.forEach((c:any)=> lines.push(`**${c.summary?.slice(0,120)}**\n${c.summary}`)); }
  if (topics.length) { lines.push(`\n## Topic Brief`); topics.forEach((t:any)=> lines.push(`**${t.topic}**\n${t.context}\nRecent: ${t.recentDevelopments}\nWhy: ${t.whyItMatters}\nAngle: ${t.discussionAngle}`)); }
  lines.push(`\n## Talking Points`);
  if (tps.highPriority?.length) { lines.push(`**High Priority**`); tps.highPriority.forEach((p:string)=> lines.push(`- ${p}`)); }
  if (tps.opportunity?.length) { lines.push(`**Opportunity**`); tps.opportunity.forEach((p:string)=> lines.push(`- ${p}`)); }
  lines.push(`\n## Conversation Starters`); starters.forEach((s:any,i:number)=> lines.push(`${i+1}. "${s.text}" — ${s.context}${s.attendee?` (for ${s.attendee})`:""}`));
  if (questions.length) { lines.push(`\n## Questions`); questions.forEach((q:string)=> lines.push(`- ${q}`)); }
  if (watch?.length) { lines.push(`\n## Watch Out For`); watch.forEach((w:string)=> lines.push(`- ${w}`)); }
  if (sources.length) { lines.push(`\n## Sources`); sources.forEach((s:any)=> lines.push(`- [${s.title}](${s.url}) — ${s.type} (${s.credibility})`)); }
  return lines.join("\n");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
  const format = request.nextUrl.searchParams.get("format") ?? "markdown";
  const meeting = await prisma.meeting.findUnique({ where:{id}, include:{ attendees:true, brief:true } });
  if (!meeting) return NextResponse.json({ success:false, error:"Meeting not found"}, {status:404});
  if (!meeting.brief) return NextResponse.json({ success:false, error:"Brief not ready"}, {status:404});
  if (format==="json") return NextResponse.json({ success:true, data:{ meeting, brief: {
    ...meeting.brief,
    tldr: parseMaybeJson(meeting.brief.tldr), attendeeSummaries: parseMaybeJson(meeting.brief.attendeeSummaries),
    companyContext: parseMaybeJson(meeting.brief.companyContext), topicBriefs: parseMaybeJson(meeting.brief.topicBriefs),
    talkingPoints: parseMaybeJson(meeting.brief.talkingPoints), conversationStarters: parseMaybeJson(meeting.brief.conversationStarters),
    questions: parseMaybeJson(meeting.brief.questions), watchOuts: parseMaybeJson(meeting.brief.watchOuts), sources: parseMaybeJson(meeting.brief.sources),
  }}});
  const md = toMarkdown(meeting, meeting.brief);
  return new NextResponse(md, { headers:{ "Content-Type":"text/markdown; charset=utf-8", "Content-Disposition":`attachment; filename="brief-${id}.md"` }});
}