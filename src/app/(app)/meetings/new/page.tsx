"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn, getInitials, formatDate } from "@/lib/utils"
import {
  Plus,
  X,
  Sparkles,
  Calendar,
  Clock,
  Users,
  Building2,
  FileText,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react"

interface Attendee {
  id: string
  name: string
  email: string
  role: string
  company: string
  linkedin: string
  twitter: string
  github: string
  notes: string
}

const initialAttendee: Attendee = {
  id: "",
  name: "",
  email: "",
  role: "",
  company: "",
  linkedin: "",
  twitter: "",
  github: "",
  notes: "",
}

export default function NewMeetingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [host, setHost] = useState({ name: "You", email: "" })
  const [meeting, setMeeting] = useState({
    title: "",
    dateTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    duration: 60,
    location: "",
    meetingUrl: "",
    description: "",
    agenda: "",
    additionalContext: "",
  })

  const [attendees, setAttendees] = useState<Attendee[]>([
    { ...initialAttendee, id: "1" },
  ])

  const updateMeeting = (field: string, value: string) => {
    setMeeting(prev => ({ ...prev, [field]: value }))
  }

  const addAttendee = () => {
    setAttendees(prev => [...prev, { ...initialAttendee, id: Date.now().toString() }])
  }

  const removeAttendee = (id: string) => {
    if (attendees.length <= 1) return
    setAttendees(prev => prev.filter(a => a.id !== id))
  }

  const updateAttendee = (id: string, field: keyof Attendee, value: string) => {
    setAttendees(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  const validAttendees = attendees.filter(a => a.name.trim())

  const nextStep = () => {
    if (step === 1 && !meeting.title.trim()) {
      setError("Meeting title is required")
      return
    }
    if (step === 2 && validAttendees.length === 0) {
      setError("At least one attendee is required")
      return
    }
    setError("")
    setStep(prev => Math.min(prev + 1, 3))
  }

  const prevStep = () => {
    setError("")
    setStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...meeting,
          duration: Number(meeting.duration),
          attendees: validAttendees,
          host: host.name.trim() ? host : undefined,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to create meeting")
      }

      router.push(`/meetings/${data.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    { num: 1, label: "Basics", icon: Calendar },
    { num: 2, label: "Attendees", icon: Users },
    { num: 3, label: "Details", icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Header */}
      <div className="sticky top-16 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 sm:px-6 lg:pl-72">
        <div className="mx-auto max-w-3xl py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="font-display text-heading-lg font-semibold">New Meeting</h1>
                <p className="text-sm text-muted-foreground">Step {step} of 3</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              {steps.map((s, i) => (
                <div key={s.num} className="flex items-center">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all",
                    i + 1 < step
                      ? "bg-primary text-primary-foreground"
                      : i + 1 === step
                      ? "bg-primary/10 text-primary border border-primary"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {i + 1 < step ? <Check className="h-4 w-4" /> : s.num}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={cn(
                      "w-16 h-px mx-2",
                      i + 1 < step ? "bg-primary" : "bg-border"
                    )} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Form */}
      <main className="flex-1 p-4 sm:p-6 lg:pl-72">
        <div className="mx-auto max-w-3xl">
          {error && (
            <div className="mb-6 flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive animate-slide-in-from-top">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Meeting Basics */}
            {step === 1 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Meeting Basics
                    </CardTitle>
                    <CardDescription>
                      Start with the essentials. You can always edit these later.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                      <p className="text-sm font-medium flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">You</span> Host — You are hosting this meeting</p>
                      <div className="grid gap-3 sm:grid-cols-2 mt-3">
                        <div className="space-y-1.5"><Label htmlFor="hostName">Host Name</Label><Input id="hostName" value={host.name} onChange={e=>setHost(p=>({...p, name:e.target.value}))} placeholder="You"/></div>
                        <div className="space-y-1.5"><Label htmlFor="hostEmail">Host Email</Label><Input id="hostEmail" type="email" value={host.email} onChange={e=>setHost(p=>({...p, email:e.target.value}))} placeholder="you@company.com"/></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Host is not researched as external attendee. Common ground will be computed against host.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Meeting Title *</Label>
                      <Input
                        id="title"
                        value={meeting.title}
                        onChange={e => updateMeeting("title", e.target.value)}
                        placeholder="Q4 Partnership Discussion with Acme AI"
                        required
                        className="text-lg"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="dateTime">Date & Time *</Label>
                        <Input
                          id="dateTime"
                          type="datetime-local"
                          value={meeting.dateTime}
                          onChange={e => updateMeeting("dateTime", e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={meeting.duration}
                          onChange={e => updateMeeting("duration", e.target.value)}
                          min="15"
                          max="480"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={meeting.location}
                          onChange={e => updateMeeting("location", e.target.value)}
                          placeholder="Office, Zoom, Coffee shop..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="meetingUrl">Meeting URL</Label>
                        <Input
                          id="meetingUrl"
                          value={meeting.meetingUrl}
                          onChange={e => updateMeeting("meetingUrl", e.target.value)}
                          placeholder="https://zoom.us/..., https://meet.google.com/..."
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={nextStep} className="gap-2" size="lg">
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 2: Attendees */}
            {step === 2 && (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          Attendees
                        </CardTitle>
                        <CardDescription>
                          Add everyone who will be in the room. More context = better research.
                        </CardDescription>
                      </div>
                      <Button variant="outline" onClick={addAttendee} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Attendee
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {attendees.map((attendee, index) => (
                        <AttendeeCard
                          key={attendee.id}
                          attendee={attendee}
                          index={index}
                          onUpdate={updateAttendee}
                          onRemove={() => removeAttendee(attendee.id)}
                          canRemove={attendees.length > 1}
                        />
                      ))}
                    </div>

                    {validAttendees.length === 0 && (
                      <div className="mt-4 p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-center">
                        <p className="text-sm text-destructive">
                          Add at least one attendee to continue
                        </p>
                      </div>
                    )}

                    <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
                      <p className="text-sm text-muted-foreground">
                        <strong>Tip:</strong> Include email, role, and company for best research results.
                        LinkedIn/Twitter URLs help us find the right person.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={prevStep}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={nextStep} disabled={validAttendees.length === 0} className="gap-2" size="lg">
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Details */}
            {step === 3 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Meeting Details
                    </CardTitle>
                    <CardDescription>
                      The more context you provide, the better your brief will be.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="description">Meeting Description</Label>
                      <Textarea
                        id="description"
                        value={meeting.description}
                        onChange={e => updateMeeting("description", e.target.value)}
                        placeholder="Brief overview of the meeting purpose and desired outcomes..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agenda">Agenda</Label>
                      <Textarea
                        id="agenda"
                        value={meeting.agenda}
                        onChange={e => updateMeeting("agenda", e.target.value)}
                        placeholder="1. Opening & introductions
2. Partnership overview
3. Technical integration discussion
4. Commercial terms
5. Next steps & action items"
                        rows={5}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="additionalContext">Additional Context (Optional)</Label>
                      <Textarea
                        id="additionalContext"
                        value={meeting.additionalContext}
                        onChange={e => updateMeeting("additionalContext", e.target.value)}
                        placeholder="Any extra background, goals, constraints, or things to avoid..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Attendee Summary */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Title</dt>
                        <dd className="font-medium">{meeting.title || "—"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Date</dt>
                        <dd className="font-medium">{meeting.dateTime ? formatDate(meeting.dateTime) : "—"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Duration</dt>
                        <dd className="font-medium">{meeting.duration} minutes</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Attendees</dt>
                        <dd className="font-medium">{validAttendees.length}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={prevStep}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="gap-2" size="lg">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Create & Start Research
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </main>
    </div>
  )
}

function AttendeeCard({ attendee, index, onUpdate, onRemove, canRemove }: {
  attendee: Attendee
  index: number
  onUpdate: (id: string, field: keyof Attendee, value: string) => void
  onRemove: () => void
  canRemove: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
            {index + 1}
          </div>
          <div>
            <p className="font-medium">Attendee {index + 1}</p>
            <p className="text-xs text-muted-foreground">
              {attendee.name || "Not named yet"}
            </p>
          </div>
        </div>
        {canRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove} className="text-muted-foreground hover:text-destructive">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`name-${attendee.id}`}>Name *</Label>
          <Input
            id={`name-${attendee.id}`}
            value={attendee.name}
            onChange={e => onUpdate(attendee.id, "name", e.target.value)}
            placeholder="Jane Doe"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`email-${attendee.id}`}>Email</Label>
          <Input
            id={`email-${attendee.id}`}
            type="email"
            value={attendee.email}
            onChange={e => onUpdate(attendee.id, "email", e.target.value)}
            placeholder="jane@company.com"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`role-${attendee.id}`}>Role</Label>
          <Input
            id={`role-${attendee.id}`}
            value={attendee.role}
            onChange={e => onUpdate(attendee.id, "role", e.target.value)}
            placeholder="VP Engineering"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`company-${attendee.id}`}>Company</Label>
          <Input
            id={`company-${attendee.id}`}
            value={attendee.company}
            onChange={e => onUpdate(attendee.id, "company", e.target.value)}
            placeholder="Acme AI"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`linkedin-${attendee.id}`}>LinkedIn</Label>
          <Input
            id={`linkedin-${attendee.id}`}
            value={attendee.linkedin}
            onChange={e => onUpdate(attendee.id, "linkedin", e.target.value)}
            placeholder="linkedin.com/in/janedoe"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`twitter-${attendee.id}`}>Twitter/X</Label>
          <Input
            id={`twitter-${attendee.id}`}
            value={attendee.twitter}
            onChange={e => onUpdate(attendee.id, "twitter", e.target.value)}
            placeholder="@janedoe"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`notes-${attendee.id}`}>Notes</Label>
        <Input
          id={`notes-${attendee.id}`}
          value={attendee.notes}
          onChange={e => onUpdate(attendee.id, "notes", e.target.value)}
          placeholder="Any additional context about this person..."
        />
      </div>
    </div>
  )
}