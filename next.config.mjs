/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure webpack for @xenova/transformers (client-side Whisper)
  webpack: (config, { isServer }) => {
    // Only apply these settings for client-side bundle
    if (!isServer) {
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      }
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }
    
    // Exclude @xenova/transformers from server-side bundle
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('@xenova/transformers')
    }
    
    return config
  },
  // Transpile the transformers package
  transpilePackages: ['@xenova/transformers'],
}

export default nextConfig
