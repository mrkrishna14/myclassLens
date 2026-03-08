import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from "react";
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClassLens - Interactive Lecture Tool',
  description: 'Upload and interact with pre-recorded lecture videos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <Suspense>
        <body className={inter.className}>{children}</body>
      </Suspense>
    </html>
  )
}
