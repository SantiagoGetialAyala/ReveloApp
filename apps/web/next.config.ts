import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@revelo/shared'],
  // Keep `next dev` assets separate from `next build` so one cannot replace
  // the styles and chunks currently being served by the other.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
};

export default nextConfig;
