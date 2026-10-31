import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev badge would show up in recorded demos.
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.aceternity.com",
      },
    ],
  },
};

export default nextConfig;
