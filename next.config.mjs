import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: resolve(__dirname),
  reactStrictMode: true,

  // Pino uses worker threads for transports (pino-pretty).
  // Bundling it causes "Cannot find module lib/worker.js" at runtime.
  // Mark as external so Node resolves them from node_modules directly.
  serverExternalPackages: ['pino', 'ioredis'],

  // Allow cross-origin dev requests for HMR
  allowedDevOrigins: [
    'app.netbones.co.za',
    'soralia.netbones.co.za',
    'soralia.co.za',
    'soralia.org',
    'soralia.com',
    'solaris.co.za',
  ],

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

  async rewrites() {
    return [
      {
        source: '/ingest/:path*',
        destination: `${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com'}/:path*`,
      },
    ];
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        dns: false,
        fs: false,
        net: false,
        tls: false,
      };

      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        lucideIcons: {
          test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
          name: 'lucide-icons',
          chunks: 'all',
          priority: 20,
          reuseExistingChunk: true,
        },
        tiptap: {
          test: /[\\/]node_modules[\\/](@tiptap|prosemirror|lowlight|highlight\.js)[\\/]/,
          name: 'tiptap-editor',
          chunks: 'async',
          priority: 20,
          reuseExistingChunk: true,
        },
        leaflet: {
          test: /[\\/]node_modules[\\/](react-leaflet|leaflet)[\\/]/,
          name: 'leaflet-map',
          chunks: 'async',
          priority: 20,
          reuseExistingChunk: true,
        },
      };
    }
    return config;
  },
};

export default nextConfig;
