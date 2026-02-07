import { Inter } from 'next/font/google'
import Image from 'next/image'

const inter = Inter({ subsets: ['latin'] })

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-gray-50`}>
      {/* Simple header for public pages */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <a href="/">
            <Image
              src="/Ovaview-Media-Monitoring-Logo.png"
              alt="Ovaview - Media Monitoring & Analysis"
              width={180}
              height={55}
            />
          </a>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
