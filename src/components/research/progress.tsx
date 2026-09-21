"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Loader2, AlertCircle, Search, Users, Building2, FileText, Brain } from "lucide-react"
import { cn } from "@/lib/utils"

interface ResearchProgressProps {
  stage: 'extracting' | 'attendees' | 'companies' | 'topics' | 'synthesizing' | 'complete' | 'error'
  message: string
  progress: number
}

const stageConfig = {
  extracting: { label: 'Extracting Topics', icon: FileText, color: 'blue' },
  attendees: { label: 'Researching Attendees', icon: Users, color: 'green' },
  companies: { label: 'Researching Companies', icon: Building2, color: 'purple' },
  topics: { label: 'Researching Topics', icon: Search, color: 'orange' },
  synthesizing: { label: 'Generating Brief', icon: Brain, color: 'indigo' },
  complete: { label: 'Complete', icon: CheckCircle, color: 'success' },
  error: { label: 'Error', icon: AlertCircle, color: 'destructive' },
}

export function ResearchProgress({ stage, message, progress }: ResearchProgressProps) {
  const config = stageConfig[stage]
  const Icon = config.icon
  const isComplete = stage === 'complete'
  const isError = stage === 'error'

  return (
    <Card className="border-primary/20">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              isComplete && "bg-green-100 text-green-600",
              isError && "bg-red-100 text-red-600",
              !isComplete && !isError && "bg-primary/10 text-primary"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{config.label}</span>
                <Badge variant={config.color as any}>{progress}%</Badge>
              </div>
              <Progress value={progress} className="h-2 mt-1" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {stage !== 'complete' && stage !== 'error' && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            {isComplete && <CheckCircle className="h-4 w-4 text-green-600" />}
            {isError && <AlertCircle className="h-4 w-4 text-red-600" />}
            <span>{message}</span>
          </div>

          <div className="flex items-center gap-2">
            {['extracting', 'attendees', 'companies', 'topics', 'synthesizing', 'complete'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i < ['extracting', 'attendees', 'companies', 'topics', 'synthesizing', 'complete'].indexOf(stage) ? 'bg-green-500' :
                  i === ['extracting', 'attendees', 'companies', 'topics', 'synthesizing', 'complete'].indexOf(stage) && !isComplete && !isError ? 'bg-primary animate-pulse' :
                  'bg-muted'
                )} />
                {i < 5 && <div className="w-16 h-0.5 bg-muted mx-1" />}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}