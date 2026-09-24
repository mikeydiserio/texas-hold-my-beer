import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'export',
  compiler: { styledComponents: true },
  images: { unoptimized: true },
};
export default config;
