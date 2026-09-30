/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel manages the build output automatically.
  // 'standalone' is only needed for Docker self-hosting.
  // When deploying to Vercel, omit the output field entirely.
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
};
export default nextConfig;
