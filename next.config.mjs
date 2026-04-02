/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable instrumentation hook for cron jobs
  experimental: {
    instrumentationHook: true,
  },
  // Proxy /api/* to Express backend when NEXT_PUBLIC_API_URL is set
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (apiUrl && apiUrl !== 'local') {
      return [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/:path*`,
        },
      ]
    }
    return []
  },
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

    // Fix canvg/core-js module resolution issue with jspdf
    config.resolve.alias = {
      ...config.resolve.alias,
      'core-js/modules/es.promise.js': false,
      'core-js/modules/es.string.match.js': false,
      'core-js/modules/es.string.replace.js': false,
      'core-js/modules/es.string.starts-with.js': false,
      'core-js/modules/es.array.iterator.js': false,
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
