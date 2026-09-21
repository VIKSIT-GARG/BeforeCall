import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Brain,
  LayoutDashboard,
  Plus,
  Calendar,
  Search,
  Settings,
  LogOut,
  ChevronLeft,
  Bell,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Dashboard — Meeting Prep Assistant",
  description: "Your meeting preparation workspace",
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:flex-col fixed lg:static inset-y-0 left-0 z-40 w-64 border-r border-border bg-card transition-transform duration-300 ease-in-out">
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-lg">Meeting Prep</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
          <NavItem 
            href="/dashboard" 
            icon={LayoutDashboard}
            label="Dashboard"
            active={true}
          />
          <NavItem 
            href="/meetings/new" 
            icon={Plus}
            label="New Meeting"
          />
          <NavItem 
            href="/meetings" 
            icon={Calendar}
            label="All Meetings"
          />
          <NavItem 
            href="/search" 
            icon={Search}
            label="Search"
          />
        </nav>

        <div className="p-4 border-t border-border">
          <NavItem 
            href="/settings" 
            icon={Settings}
            label="Settings"
          />
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      <div className="lg:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur-sm" aria-hidden="true" />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" aria-label="Open menu">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-heading-md font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors relative" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">3</span>
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                JD
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium">Jane Doe</p>
                <p className="text-xs text-muted-foreground">Pro Plan</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavItem({ 
  href, 
  icon: Icon, 
  label, 
  active = false 
}: { 
  href: string; 
  icon: React.ComponentType<any>; 
  label: string; 
  active?: boolean;
}) {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent",
        active && "shadow-sm"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {label}
    </Link>
  )
}