"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Search, Plus } from "lucide-react"

interface EmptyStateProps {
  searchQuery: string
}

export function EmptyState({ searchQuery }: EmptyStateProps) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No meetings found</h3>
      <p className="text-muted-foreground mb-6">
        {searchQuery ? "Try adjusting your search or filters" : "Create your first meeting to get started"}
      </p>
      <Link href="/meetings/new">
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Meeting
        </Button>
      </Link>
    </div>
  )
}