import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // opennextjs-cloudflare needs .next/standalone. It normally gets that by
  // running `next build` itself with standalone injected — but that path shells
  // out to `npm run build`, so `build` cannot be the OpenNext build without
  // recursing forever. Declaring it here lets `build` run the two steps in
  // order (see package.json), which is what Cloudflare Workers Builds invokes.
  output: "standalone",
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
