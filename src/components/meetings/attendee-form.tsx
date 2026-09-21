"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"
import { AttendeeInput } from "@/types"
import { cn } from "@/lib/utils"

interface AttendeeFormProps {
  attendee: AttendeeInput
  index: number
  onUpdate: (index: number, field: keyof AttendeeInput, value: string) => void
  onRemove: () => void
  canRemove: boolean
}

export function AttendeeForm({ attendee, index, onUpdate, onRemove, canRemove }: AttendeeFormProps) {
  return (
    <Card className="bg-muted/50">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`attendee-name-${index}`}>Name *</Label>
                <Input
                  id={`attendee-name-${index}`}
                  value={attendee.name}
                  onChange={(e) => onUpdate(index, "name", e.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`attendee-email-${index}`}>Email</Label>
                <Input
                  id={`attendee-email-${index}`}
                  type="email"
                  value={attendee.email || ""}
                  onChange={(e) => onUpdate(index, "email", e.target.value)}
                  placeholder="jane@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`attendee-role-${index}`}>Role</Label>
                <Input
                  id={`attendee-role-${index}`}
                  value={attendee.role || ""}
                  onChange={(e) => onUpdate(index, "role", e.target.value)}
                  placeholder="VP Engineering"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`attendee-company-${index}`}>Company</Label>
                <Input
                  id={`attendee-company-${index}`}
                  value={attendee.company || ""}
                  onChange={(e) => onUpdate(index, "company", e.target.value)}
                  placeholder="Acme AI"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`attendee-linkedin-${index}`}>LinkedIn</Label>
                <Input
                  id={`attendee-linkedin-${index}`}
                  value={attendee.linkedin || ""}
                  onChange={(e) => onUpdate(index, "linkedin", e.target.value)}
                  placeholder="linkedin.com/in/janedoe"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`attendee-twitter-${index}`}>Twitter/X</Label>
                <Input
                  id={`attendee-twitter-${index}`}
                  value={attendee.twitter || ""}
                  onChange={(e) => onUpdate(index, "twitter", e.target.value)}
                  placeholder="@janedoe"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`attendee-notes-${index}`}>Notes</Label>
              <Input
                id={`attendee-notes-${index}`}
                value={attendee.notes || ""}
                onChange={(e) => onUpdate(index, "notes", e.target.value)}
                placeholder="Any additional context about this person..."
              />
            </div>
          </div>

          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive mt-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}