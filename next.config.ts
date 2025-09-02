import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Increase to 50MB or whatever you need
    },
  },
};

export default nextConfig;
