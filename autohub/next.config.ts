import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  experimental: {
    outputFileTracingIncludes: {
      '/api/car-images': ['./public/**/*'],
    },
  },
};

export default nextConfig;
