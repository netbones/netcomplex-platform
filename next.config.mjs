/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Pino uses worker threads for transports (pino-pretty).
  // Bundling it causes "Cannot find module lib/worker.js" at runtime.
  // Mark as external so Node resolves them from node_modules directly.
  serverExternalPackages: ['pino'],

  // Allow cross-origin dev requests for HMR
  allowedDevOrigins: ['app.netbones.co.za'],

  // Enable Partial Prerendering for better performance
  // Note: cacheComponents incompatible with dynamic = 'force-dynamic'
  // cacheComponents: true,

  // Optimize images
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: 'app.netbones.co.za',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Configure headers for better caching
  async headers() {
    return [
      {
        source: '/api/stats',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600', // 5min cache + 10min stale
          },
        ],
      },
      {
        source: '/api/content',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=180, stale-while-revalidate=300', // 3min cache + 5min stale
          },
        ],
      },
    ];
  },
};

export default nextConfig;
