"use server"
import { cookies } from "next/headers"

// abstraction for current user — future: replace with NextAuth getServerSession
export interface CurrentUser {
  id: string
  name: string
  email: string | null
  initials: string
  plan: string
}

export async function getCurrentUser(): Promise<CurrentUser> {
  // TODO: replace with actual auth (NextAuth). For now, anonymous "You"
  // never hardcode Jane Doe / John Doe
  return {
    id: "you",
    name: "You",
    email: null,
    initials: "Yo",
    plan: "Your Workspace",
  }
}

export function getCurrentUserSync(): CurrentUser {
  return { id: "you", name: "You", email: null, initials: "Yo", plan: "Your Workspace" }
}