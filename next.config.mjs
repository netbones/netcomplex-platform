/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},

  // Enable Partial Prerendering for better performance and cost efficiency
  experimental: {
    ppr: 'incremental',
  },

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
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Set resource limits to prevent cost overruns
  serverRuntimeConfig: {
    maxDuration: 10, // Default 10s limit for API routes
  },

  // Optimize for edge runtime where possible
  serverComponentsExternalPackages: [],

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
