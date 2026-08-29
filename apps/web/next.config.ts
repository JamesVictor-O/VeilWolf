import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@veilwolf/game-engine", "@veilwolf/ui"],
};

export default nextConfig;
