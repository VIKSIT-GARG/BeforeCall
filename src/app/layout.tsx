import type { Metadata, Viewport } from "next"
import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"

export const metadata: Metadata = {
  title: "Meeting Prep Assistant — Walk into every meeting prepared",
  description: "Research the people. Understand the context. Know what to ask. AI-powered meeting preparation that gives you the edge.",
  keywords: ["meeting preparation", "meeting intelligence", "attendee research", "AI assistant", "business meetings"],
  authors: [{ name: "Meeting Prep Assistant" }],
  creator: "Meeting Prep Assistant",
  publisher: "Meeting Prep Assistant",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://meeting-prep-assistant.com",
    title: "Meeting Prep Assistant — Walk into every meeting prepared",
    description: "Research the people. Understand the context. Know what to ask.",
    siteName: "Meeting Prep Assistant",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meeting Prep Assistant",
    description: "Walk into every meeting prepared. AI-powered meeting intelligence.",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf8f0" },
    { media: "(prefers-color-scheme: dark)", color: "#11110f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}