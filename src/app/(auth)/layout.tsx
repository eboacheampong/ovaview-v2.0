import Image from 'next/image'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen relative flex items-center">
      {/* Full background image */}
      <Image
        src="/ovaview-login-banner.jpg"
        alt=""
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />
      {/* Subtle dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/20" />
      {/* Content */}
      <div className="relative z-10 w-full px-6 sm:px-12 lg:px-20 py-8">
        {children}
      </div>
    </div>
  )
}
