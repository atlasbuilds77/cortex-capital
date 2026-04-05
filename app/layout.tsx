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
  title: 'Portfolio Health Score | Cortex Capital - Free AI Portfolio Analysis',
  description: 'Get your free portfolio health score. See your risk-adjusted returns, diversification score, and personalized recommendations. Like Credit Karma for your investments.',
  keywords: ['portfolio analyzer', 'investment health score', 'AI trading', 'portfolio analysis', 'stock portfolio score', 'investment risk analysis', 'portfolio diversification'],
  openGraph: {
    title: 'What\'s Your Portfolio Health Score?',
    description: 'Free AI-powered portfolio analysis. Get your score in 2 minutes.',
    type: 'website',
    url: 'https://cortexcapitalgroup.com',
    images: [
      {
        url: '/og-health-score.png',
        width: 1200,
        height: 630,
        alt: 'Cortex Portfolio Health Score',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'What\'s Your Portfolio Health Score?',
    description: 'Free AI-powered portfolio analysis. Get your score in 2 minutes.',
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
