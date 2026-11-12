import type { NextConfig } from "next";

// A normal `next start` works locally; Docker enables standalone output explicitly.
const nextConfig: NextConfig = {
  ...(process.env.NEXT_STANDALONE === "true" ? { output: "standalone" as const } : {}),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    // Generated art and fonts live in `public/assets` and never change without a
    // new deploy, so neither the browser nor the Vercel edge should revalidate
    // them on every navigation.
    return [
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/brand-mark.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
