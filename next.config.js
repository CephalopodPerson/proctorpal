/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Optimize for the kind of realtime work the dashboard does
    serverActions: { bodySizeLimit: "2mb" },
  },
  images: {
    // Question media may be uploaded to Supabase storage; set the host you use.
    // Replace YOUR_PROJECT_REF after wiring Supabase.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

module.exports = nextConfig;
