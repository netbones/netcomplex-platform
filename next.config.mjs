/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},

  // Enable Partial Prerendering for better performance
  cacheComponents: true,

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
