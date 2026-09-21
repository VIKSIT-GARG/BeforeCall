"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AttendeeForm } from "./attendee-form"
import { MeetingInput, AttendeeInput } from "@/types"
import { cn } from "@/lib/utils"

interface MeetingFormProps {
  initialData?: Partial<MeetingInput>
  onSubmit: (data: MeetingInput) => void
  isLoading?: boolean
}

export function MeetingForm({ initialData, onSubmit, isLoading }: MeetingFormProps) {
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [agenda, setAgenda] = useState(initialData?.agenda || "")
  const [dateTime, setDateTime] = useState(initialData?.dateTime || new Date(Date.now() + 3600000).toISOString().slice(0, 16))
  const [duration, setDuration] = useState(initialData?.duration || 60)
  const [location, setLocation] = useState(initialData?.location || "")
  const [meetingUrl, setMeetingUrl] = useState(initialData?.meetingUrl || "")
  const [additionalContext, setAdditionalContext] = useState(initialData?.additionalContext || "")
  const [attendees, setAttendees] = useState<AttendeeInput[]>(initialData?.attendees || [{ name: "", email: "", role: "", company: "" }])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      title,
      description,
      agenda,
      dateTime,
      duration,
      location,
      meetingUrl,
      additionalContext,
      attendees: attendees.filter(a => a.name.trim()),
    })
  }

  const addAttendee = () => {
    setAttendees([...attendees, { name: "", email: "", role: "", company: "" }])
  }

  const removeAttendee = (index: number) => {
    setAttendees(attendees.filter((_, i) => i !== index))
  }

  const updateAttendee = (index: number, field: keyof AttendeeInput, value: string) => {
    setAttendees(attendees.map((a, i) => i === index ? { ...a, [field]: value } : a))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meeting Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Q4 Partnership Discussion with Acme AI"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateTime">Date & Time *</Label>
            <Input
              id="dateTime"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                min="15"
                max="480"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Office, Zoom, Coffee shop, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meetingUrl">Meeting URL</Label>
            <Input
              id="meetingUrl"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://zoom.us/..., https://meet.google.com/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the meeting purpose..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agenda">Agenda</Label>
            <Textarea
              id="agenda"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="1. Topic one\n2. Topic two\n3. Topic three..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalContext">Additional Context (Optional)</Label>
            <Textarea
              id="additionalContext"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Any extra context, goals, or background info..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Attendees</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addAttendee}>
            + Add Attendee
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {attendees.map((attendee, index) => (
              <AttendeeForm
                key={index}
                attendee={attendee}
                index={index}
                onUpdate={updateAttendee}
                onRemove={() => removeAttendee(index)}
                canRemove={attendees.length > 1}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !title.trim() || attendees.filter(a => a.name.trim()).length === 0}>
          {isLoading ? "Creating..." : "Create Meeting"}
        </Button>
      </div>
    </form>
  )
}