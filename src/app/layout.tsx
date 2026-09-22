import type { Metadata, Viewport } from "next"
import { Instrument_Sans, Fraunces, IBM_Plex_Mono } from "next/font/google"
import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"

const instrumentSans = Instrument_Sans({ 
  subsets: ["latin"], 
  variable: "--font-inter",
  display: "swap",
})

const fraunces = Fraunces({ 
  subsets: ["latin"], 
  variable: "--font-display",
  display: "swap",
  axes: ["SOFT","WONK","opsz"],
})

const ibmPlexMono = IBM_Plex_Mono({ 
  subsets: ["latin"], 
  weight: ["400","500"],
  variable: "--font-mono",
  display: "swap",
})

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
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
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
    <html lang="en" className={`${instrumentSans.variable} ${fraunces.variable} ${ibmPlexMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}