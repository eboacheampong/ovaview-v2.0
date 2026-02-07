import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Ovaview - Media Monitoring & Analysis',
  description: 'Comprehensive media monitoring and analysis platform',
  icons: {
    icon: '/ovaview-site-icon.png',
    shortcut: '/ovaview-site-icon.png',
    apple: '/ovaview-site-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}