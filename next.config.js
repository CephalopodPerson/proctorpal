/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // serverActions moved to top-level in Next 15.
  serverActions: {
    bodySizeLimit: "2mb",
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
