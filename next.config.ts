import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PHASE: process.env.NEXT_PHASE || "",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**", // Allows all paths from Unsplash
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
