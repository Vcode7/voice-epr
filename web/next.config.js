/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Increase payload size for audio uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

module.exports = nextConfig;
