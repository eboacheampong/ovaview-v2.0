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
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/">
            <Image
              src="/Ovaview-Media-Monitoring-Logo.png"
              alt="Ovaview - Media Monitoring & Analysis"
              width={160}
              height={48}
            />
          </a>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
