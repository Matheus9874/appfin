import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allows accessing the dev server from other devices on the same network
  // (e.g. testing on a phone), which Next.js blocks by default.
  allowedDevOrigins: ["192.168.15.161"],
};

export default nextConfig;
