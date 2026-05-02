import type { NextConfig } from "next";
import withPWA from "next-pwa";
import runtimeCaching from "next-pwa/cache";

const isVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_URL);

const nextConfig: NextConfig = {
  async headers() {
    if (isVercel) return [];
    return [
      {
        source: "/:path*",
        has: [{ type: "header", key: "accept", value: ".*text/html.*" }],
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

const withPwaConfig = withPWA({
  dest: "public",
  disable: !isVercel || (process.env.NODE_ENV === "development" && process.env.PWA_DEV !== "true"),
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
