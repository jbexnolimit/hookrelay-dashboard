
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  skipTrailingSlashRedirect: true,
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
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
