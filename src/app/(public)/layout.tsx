import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-gray-50`}>
      {/* Simple header for public pages */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <a href="/" className="text-xl font-bold text-orange-600">OvaView</a>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
