import { Metadata } from "next"
import Link from "next/link"
import {
  Brain,
  LayoutDashboard,
  Plus,
  Calendar,
  Search,
  Settings,
  Bell,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getCurrentUser } from "@/lib/current-user"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { GlobalSearchButton } from "@/components/layout/GlobalSearchButton"

export const metadata: Metadata = {
  title: "Dashboard — BeforeCall",
  description: "Your meeting preparation workspace",
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex lg:flex-col fixed lg:static inset-y-0 left-0 z-40 w-64 border-r border-border bg-card">
        <div className="flex h-16 items-center px-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-lg">BeforeCall</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/meetings/new" icon={Plus} label="New Meeting" />
          <NavItem href="/meetings" icon={Calendar} label="All Meetings" />
          <NavItem href="/search" icon={Search} label="Search" />
        </nav>

        <div className="p-4 border-t border-border">
          <NavItem href="/settings" icon={Settings} label="Settings" />
          <div className="mt-4 rounded-xl bg-muted p-3">
            <p className="text-xs font-medium">{user.plan}</p>
            <p className="text-xs text-muted-foreground">Evidence-backed intelligence</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent" aria-label="Open menu">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-heading-md font-semibold hidden sm:block">Your Meetings</h1>
          </div>
          <div className="flex items-center gap-2">
            <GlobalSearchButton />
            <NotificationBell />
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-sm">
                {user.initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.plan}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavItem({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<any>; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {label}
    </Link>
  )
}