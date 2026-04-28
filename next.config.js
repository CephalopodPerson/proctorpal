/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
