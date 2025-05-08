import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    webVitalsAttribution: ["CLS", "LCP"],
  },
  distDir: ".next",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.coingecko.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "coin-images.coingecko.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s2.coinmarketcap.com",
        pathname: "/static/img/coins/**",
      },
    ],
    domains: [
      "assets.coingecko.com",
      "coin-images.coingecko.com",
      "s2.coinmarketcap.com",
    ],
    deviceSizes: [
      32, 48, 64, 96, 128, 256, 384, 512, 640, 750, 828, 1080, 1200, 1920, 2048,
      3840,
    ],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    unoptimized: process.env.NODE_ENV === "development",
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
};

export default nextConfig;
