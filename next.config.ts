import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Samo za lokalni razvoj: dopušta otvaranje sajta s mobitela u kućnoj mreži
  // (npr. http://192.168.1.101:3000). Bez ovoga Next.js blokira skripte pa stranica ne reagira.
  allowedDevOrigins: ['192.168.*.*'],
  partialPrefetching: true,
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
