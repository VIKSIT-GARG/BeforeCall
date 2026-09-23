/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Aggressively prune in-memory page buffers in development to prevent RAM accumulation
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 1000,
    // Number of pages that should be kept simultaneously in memory
    pagesBufferLength: 2,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: false,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

module.exports = nextConfig;