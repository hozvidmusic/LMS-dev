/** @type {import('next').NextConfig} */
const isProd = process.env.NEXT_PUBLIC_OUTPUT === 'export';
const nextConfig = {
  output: isProd ? 'export' : undefined,
  basePath: isProd ? '/LMS-dev' : '',
  images: { unoptimized: true },
  trailingSlash: true,
};
export default nextConfig;
