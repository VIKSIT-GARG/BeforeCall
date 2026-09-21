"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  Eye,
  User,
  Building2,
  FileText,
  Clock,
  Calendar,
  MapPin,
  Link2,
  ArrowUpRight,
} from "lucide-react"
import { MeetingBrief, AttendeeSummary, Source, ConversationStarter } from "@/types"
import { formatDateTime, getInitials, cn } from "@/lib/utils"

interface MeetingBriefViewProps {
  brief: MeetingBrief
  meeting: {
    title: string
    dateTime: string
    agenda?: string
    description?: string
    attendees: Array<{ name: string; role?: string; company?: string; email?: string }>
  }
}

export function MeetingBriefView({ brief, meeting }: MeetingBriefViewProps) {
  const allSources = brief.sources || []

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{meeting.title}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDateTime(meeting.dateTime)}
                </span>
                {meeting.agenda && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Agenda provided
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                View Sources
              </Button>
              <Button size="sm">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TL;DR */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            TL;DR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {brief.tldr.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-primary font-medium">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="attendees" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="attendees">Who's in the Room</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="talking">Talking Points</TabsTrigger>
          <TabsTrigger value="starters">Starters</TabsTrigger>
        </TabsList>

        {/* Attendees Tab */}
        <TabsContent value="attendees">
          <div className="space-y-4">
            {brief.attendeeSummaries.map((attendee, i) => (
              <AttendeeCard key={i} attendee={attendee} />
            ))}
          </div>
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies">
          {brief.companyContext && brief.companyContext.length > 0 ? (
            <div className="space-y-4">
              {brief.companyContext.map((company, i) => (
                <CompanyCard key={i} company={company} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No company research available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Topics Tab */}
        <TabsContent value="topics">
          {brief.topicBriefs && brief.topicBriefs.length > 0 ? (
            <div className="space-y-4">
              {brief.topicBriefs.map((topic, i) => (
                <TopicCard key={i} topic={topic} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No topic research available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Talking Points Tab */}
        <TabsContent value="talking">
          <div className="space-y-4">
            <TalkingPointsCard 
              title="High Priority" 
              icon={AlertTriangle}
              items={brief.talkingPoints.highPriority}
              color="destructive"
            />
            <TalkingPointsCard 
              title="Opportunities" 
              icon={Lightbulb}
              items={brief.talkingPoints.opportunity}
              color="success"
            />
            <TalkingPointsCard 
              title="Questions to Ask" 
              icon={HelpCircle}
              items={brief.talkingPoints.questions}
              color="default"
            />
            <TalkingPointsCard 
              title="Follow-up" 
              icon={MessageSquare}
              items={brief.talkingPoints.followUp}
              color="secondary"
            />
          </div>
        </TabsContent>

        {/* Conversation Starters Tab */}
        <TabsContent value="starters">
          <div className="space-y-4">
            {brief.conversationStarters.map((starter, i) => (
              <StarterCard key={i} starter={starter} index={i} />
            ))}
            
            {brief.questions && brief.questions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Questions to Ask</h3>
                {brief.questions.map((q, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4">
                      <div className="flex gap-3">
                        <HelpCircle className="h-5 w-5 text-primary mt-0.5" />
                        <p className="text-sm">{q}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {brief.watchOuts && brief.watchOuts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Watch Out For
                </h3>
                {brief.watchOuts.map((w, i) => (
                  <Card key={i} className="border-destructive/20 bg-destructive/5">
                    <CardContent className="pt-4">
                      <div className="flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                        <p className="text-sm text-destructive">{w}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Sources */}
      {allSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Sources ({allSources.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {allSources.map((source, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <Badge variant={source.credibility === 'high' ? 'default' : source.credibility === 'medium' ? 'secondary' : 'outline'}>
                      {source.credibility}
                    </Badge>
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 text-primary hover:underline flex items-center gap-1"
                    >
                      {source.title}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <span className="text-muted-foreground">{source.type}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AttendeeCard({ attendee }: { attendee: AttendeeSummary }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{getInitials(attendee.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{attendee.name}</h4>
              <Badge variant={attendee.confidence === 'verified' ? 'default' : attendee.confidence === 'inferred' ? 'secondary' : 'outline'}>
                {attendee.confidence}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{attendee.role} • {attendee.company}</p>
            <p className="text-sm mt-1">{attendee.relevantBackground}</p>
            <p className="text-sm text-primary mt-1 font-medium">{attendee.whyTheyMatter}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CompanyCard({ company }: { company: any }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-4">
          <Building2 className="h-10 w-10 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold">{company.summary?.split('.')[0] || 'Company Overview'}</h4>
            <p className="text-sm text-muted-foreground mt-1">{company.summary}</p>
            {company.insights && (
              <p className="text-sm text-primary mt-2 font-medium">{company.insights}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TopicCard({ topic }: { topic: any }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <h4 className="font-semibold">{topic.topic}</h4>
        <div className="space-y-2 mt-3 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">Context: </span>
            <span>{topic.context}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Recent: </span>
            <span>{topic.recentDevelopments}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Why it matters: </span>
            <span>{topic.whyItMatters}</span>
          </div>
          <div className="text-primary font-medium">
            <span className="font-medium text-muted-foreground">Angle: </span>
            <span>{topic.discussionAngle}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TalkingPointsCard({ title, icon: Icon, items, color }: { title: string; icon: React.ComponentType<any>; items: string[]; color: string }) {
  if (!items.length) return null

  return (
    <Card className={cn(color === 'destructive' && 'border-destructive/20 bg-destructive/5', color === 'success' && 'border-green-500/20 bg-green-500/5')}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon className={cn("h-5 w-5", color === 'destructive' ? 'text-destructive' : color === 'success' ? 'text-green-500' : color === 'default' ? 'text-primary' : 'text-muted-foreground')} />
          <h4 className="font-semibold">{title}</h4>
        </div>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-sm flex gap-2">
              <span className="text-muted-foreground">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function StarterCard({ starter, index }: { starter: ConversationStarter; index: number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <span className="text-primary font-medium text-lg">{index + 1}.</span>
          <div className="flex-1">
            <p className="text-sm">"{starter.text}"</p>
            <p className="text-xs text-muted-foreground mt-1">{starter.context}</p>
            {starter.attendee && (
              <p className="text-xs text-primary mt-1">→ For {starter.attendee}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}