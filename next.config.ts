
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // async rewrites() {
  //   return [
  //     {
  //       source: "/api/backend/:path*",
  //       destination: `${process.env.HOOKRELAY_API_URL}/:path*`,
  //     },
  //   ];
  // },
};

export default nextConfig;
