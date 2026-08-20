/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Increase payload size for audio uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  async headers() {
    return [
      {
        // Allow CORS for all API routes so React Native app and web clients can communicate seamlessly
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Groq-Api-Key',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
