/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  compiler: {
    // Disable styled-jsx to prevent SSR context issues
    styledJsx: false,
  },
  experimental: {
    // Disable styled-jsx in experimental features too
    forceSwcTransforms: true,
  },
}

module.exports = nextConfig 