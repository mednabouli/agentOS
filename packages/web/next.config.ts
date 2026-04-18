import type { NextConfig } from 'next';

const config: NextConfig = {
  // @agentos/core is compiled (dist/) so no transpilation needed,
  // but listing it here ensures Next.js resolves it correctly in monorepo.
  transpilePackages: ['@agentos/core'],

  // Suppress hydration warnings from server/client timestamp deltas in event logs
  reactStrictMode: true,

  // Standalone output for containerised / self-hosted deployment
  output: process.env['NEXT_OUTPUT'] === 'standalone' ? 'standalone' : undefined,
};

export default config;
