import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Autonomous Trading Company',
  description: 'Real-time dashboard for the 6-agent trading team',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
