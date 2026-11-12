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
};

export default nextConfig;
