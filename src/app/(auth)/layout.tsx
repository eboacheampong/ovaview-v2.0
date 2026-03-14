export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-[#334851]">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#2a3d45]/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#3d5a65]/40 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-[#2a3d45]/20 rounded-full blur-2xl" />
      </div>
      <div className="relative z-10 w-full max-w-5xl">
        {children}
      </div>
    </div>
  )
}
