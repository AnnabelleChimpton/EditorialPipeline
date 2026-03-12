import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getIndexLastModified } from "@/lib/data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VCE Pipeline",
  description: "Research editorial pipeline dashboard",
};

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
        <nav className="sticky top-0 z-10 border-b border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <div className="flex items-center gap-8">
                <Link href="/" className="text-lg font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                  VCE Pipeline
                </Link>
                <div className="flex gap-1">
                  <Link
                    href="/"
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    Pipeline
                  </Link>
                  <Link
                    href="/queue"
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    Queue
                  </Link>
                </div>
              </div>
              <span className="text-xs text-stone-400 dark:text-stone-500">
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
        </nav>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
