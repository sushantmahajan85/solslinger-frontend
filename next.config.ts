import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Keeps the dev-only badge off the lobby's bottom-left music control.
  devIndicators: { position: 'bottom-right' },
};

export default nextConfig;
