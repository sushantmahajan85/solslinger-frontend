import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Keeps the dev-only badge off the lobby's bottom-left music control.
  devIndicators: { position: 'bottom-right' },
  images: { qualities: [75, 92] },
};

export default nextConfig;
