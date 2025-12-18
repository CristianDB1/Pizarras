/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { 
            key: 'Cache-Control', 
            value: 'public, max-age=31536000, immutable' 
          },
        ],
      },
    ]
  },
  experimental: {
    //prerenderEarlyExit: true,
    esmExternals: 'loose'
  },
  webpack: (config) => {
    config.externals = [...config.externals, 'mysql2']
    return config
  },
  
  // CONFIGURACIÓN CORREGIDA:
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '162.240.109.25', 
        pathname: '/~tusorteodigital/**',
      },
      {
      protocol: 'https',
      hostname: 'tusorteodigital.com',
      pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.tusorteodigital.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
    ],
    domains: ['162.240.109.25', 'www.tusorteodigital.com', 'tusorteodigital.com', 'localhost'], // ← CORREGIDO
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig;