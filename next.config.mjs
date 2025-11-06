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
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ]
  },
  // Para evitar errores durante el build
  experimental: {
    esmExternals: 'loose'
  },
  // Si usas MySQL u otras dependencias server-only
  webpack: (config) => {
    config.externals = [...config.externals, 'mysql2']
    return config
  }
}

export default nextConfig