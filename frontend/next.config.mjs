/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Static export for Render
  reactStrictMode: true,
  
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  trailingSlash: true, // Required for static export
  
  // Image optimization - unoptimized for static export
  images: {
    unoptimized: true, // Required for static export
  },

  // Environment variable validation
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },

  // Production build optimizations
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // TypeScript and ESLint
  typescript: {
    ignoreBuildErrors: true, // Relax for static export
  },
  eslint: {
    ignoreDuringBuilds: true, // Relax for static export
  },
}

export default nextConfig
