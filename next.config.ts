import type { NextConfig } from "next";
import path from "node:path";
const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  outputFileTracingRoot: path.join(process.cwd()),
  webpack(config,{dev}) { if (!dev) config.cache=false; return config; },
};
export default nextConfig;
