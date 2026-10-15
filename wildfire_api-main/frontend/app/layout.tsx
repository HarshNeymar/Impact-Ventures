import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Cinzel, Playfair_Display, Inter, Poppins, Work_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import 'maplibre-gl/dist/maplibre-gl.css'
import './globals.css'
import ClientProviders from '@/components/ClientProviders'

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-work-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Impact Ventures',
  description: 'Created with Impact Ventures',
  generator: 'Impact Ventures',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
  <body className={`m-0 font-sans ${GeistSans.variable} ${GeistMono.variable} ${cinzel.variable} ${playfair.variable} ${inter.variable} ${poppins.variable} ${workSans.variable}`}>
        <ClientProviders>
          {children}
        </ClientProviders>
        <Analytics />
      </body>
    </html>
  )
}
