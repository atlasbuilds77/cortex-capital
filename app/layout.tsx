import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import Footer from '@/components/ui/footer'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  metadataBase: new URL('https://cortexcapitalgroup.com'),
  title: 'Cortex Capital | Coming Soon',
  description: 'AI-powered trading agents, automated execution, and portfolio intelligence. The future of personal investing is almost here.',
  keywords: ['AI trading', 'automated trading', 'hedge fund', 'portfolio management', 'trading agents', 'Cortex Capital'],
  openGraph: {
    title: 'Cortex Capital | Coming Soon',
    description: 'AI-powered trading agents, automated execution, and portfolio intelligence. Coming soon.',
    type: 'website',
    url: 'https://cortexcapitalgroup.com',
    images: [
      {
        url: '/og-health-score.png',
        width: 1200,
        height: 630,
        alt: 'Cortex Capital - Coming Soon',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cortex Capital | Coming Soon',
    description: 'AI-powered trading agents, automated execution, and portfolio intelligence. Coming soon.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased flex flex-col min-h-screen`}>
        <AuthProvider>
          <main className="flex-grow">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}
