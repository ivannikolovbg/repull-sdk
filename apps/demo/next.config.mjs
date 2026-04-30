/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We import @repull/sdk from a workspace package — it ships ESM with relative .js imports.
  transpilePackages: ['@repull/sdk', '@repull/types'],
};

export default nextConfig;
