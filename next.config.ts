import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Next.js 16 core config */
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination: '/api/index.py',
      },
    ];
  },
};

export default nextConfig;
