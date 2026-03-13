import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getIndexLastModified } from "@/lib/data";
import { config } from "@/lib/config";
import { NavLink } from "@/components/nav-link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateMetadata(): Metadata {
  return {
    title: config.pipelineName,
    description: "Editorial workflow dashboard",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lastModified = getIndexLastModified();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen flex flex-col bg-background text-foreground`}
      >
        {/* Accent bar */}
        <div className="h-0.5 bg-gradient-to-r from-sky-400 via-violet-400 to-emerald-400" />

        <nav className="sticky top-0 z-10 border-b border-stone-200/80 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900">
                    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                    </svg>
                  </div>
                  <span className="text-base font-semibold text-stone-900 tracking-tight">
                    {config.pipelineName}
                  </span>
                </Link>
                <div className="h-5 w-px bg-stone-200" />
                <div className="flex gap-1">
                  <NavLink href="/">Dashboard</NavLink>
                  <NavLink href="/board">Story Board</NavLink>
                  <NavLink href="/queue">All Stories</NavLink>
                  <NavLink href="/ready">Ready to Publish</NavLink>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" title="Connected" />
                <span className="text-xs text-stone-400">
                  Updated{" "}
                  {lastModified.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        </nav>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-8 animate-in">
          {children}
        </main>

        <footer className="border-t border-stone-200/50 bg-white/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <span className="text-xs text-stone-400">{config.pipelineName}</span>
            <span className="text-xs text-stone-300">
              Last synced {lastModified.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
