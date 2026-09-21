"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Calendar, CheckCircle, Brain } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<any>
  color: string
  bgColor: string
  trend: string
}

export function StatCard({ title, value, icon: Icon, color, bgColor, trend }: StatCardProps) {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-2">{trend}</p>
          </div>
          <div className={cn("inline-flex h-12 w-12 items-center justify-center rounded-xl", bgColor)}>
            <Icon className={cn("h-6 w-6", color)} aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}