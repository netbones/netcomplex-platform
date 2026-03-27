/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
  webpack: config => {
    Object.keys(config.resolve.alias).forEach(alias => {
      if (alias.startsWith('react')) {
        delete config.resolve.alias[alias];
      }
    });
    return config;
  },
};

module.exports = nextConfig;
