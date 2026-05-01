import type { NextConfig } from "next";
import withPWA from "next-pwa";
import runtimeCaching from "next-pwa/cache";

const nextConfig: NextConfig = {
};

const withPwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development" && process.env.PWA_DEV !== "true",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /\/api\//,
      handler: "NetworkOnly",
      options: { cacheName: "api-network-only" },
    },
    ...(runtimeCaching as any),
  ],
});

export default withPwaConfig(nextConfig);
