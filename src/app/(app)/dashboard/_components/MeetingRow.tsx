"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn, formatDateTime, getInitials } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import {
  Calendar,
  Clock,
  CheckCircle,
  Loader2,
  FileText,
  Eye,
  MoreHorizontal,
  ArrowRight,
  Brain,
  Users,
} from "lucide-react"

interface MeetingRowProps {
  meeting: {
    id: string
    title: string
    dateTime: string
    status: string
    attendees: Array<{ name: string; role?: string; company?: string }>
  }
}

export function MeetingRow({ meeting }: MeetingRowProps) {
  const now = new Date()
  const meetingDate = new Date(meeting.dateTime)
  const timeUntil = formatDistanceToNow(meetingDate, { addSuffix: true })

  const statusConfig = {
    COMPLETED: { label: "Ready", color: "success", icon: CheckCircle },
    RESEARCHING: { label: "Researching", color: "default", icon: Loader2 },
    DRAFT: { label: "Draft", color: "outline", icon: FileText },
  }[meeting.status] || { label: meeting.status, color: "outline", icon: FileText }

  const StatusIcon = statusConfig.icon

  return (
    <Link href={`/meetings/${meeting.id}`} className="flex flex-row items-center gap-4 p-4 hover:bg-muted/50 transition-colors group">
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
        <Brain className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{meeting.title}</h3>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateTime(meeting.dateTime)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {timeUntil}
              </span>
              <Badge variant={statusConfig.color as any} className="gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="View brief">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More options">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {meeting.attendees.slice(0, 3).map((a, i) => (
            <Badge key={i} variant="outline" className="text-xs gap-1">
              <Avatar className="h-5 w-5">
                <AvatarFallback>{getInitials(a.name)}</AvatarFallback>
              </Avatar>
              {a.name} {a.company && `(${a.company})`}
            </Badge>
          ))}
          {meeting.attendees.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{meeting.attendees.length - 3} more
            </Badge>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">
        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  )
}