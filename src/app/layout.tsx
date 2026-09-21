import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter",
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"], 
  variable: "--font-display",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"], 
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
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1222" },
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
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
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