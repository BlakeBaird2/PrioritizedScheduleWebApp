import type { NextConfig } from "next";

/**
 * Private network addresses, so a phone on the same Wi-Fi can open the dev server
 * at http://<laptop-ip>:3000 with live reload. Only affects `next dev`.
 */
const LAN_ORIGINS = ["192.168.*.*", "10.*.*.*", ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`), "*.local"];

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle for the Docker image. Unused on Vercel.
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
  allowedDevOrigins: LAN_ORIGINS,
};

export default nextConfig;
