/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.coingecko.com",
      },
    ],
  },
};

module.exports = nextConfig;
