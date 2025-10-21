/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qiixfuupbtbuxqjckxpu.supabase.co", // your Supabase project domain
        pathname: "/storage/v1/object/public/menu-images/**",
      },
    ],
  },
};

module.exports = nextConfig;
