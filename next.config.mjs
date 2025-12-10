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
    esmExternals: 'loose'
  },
  webpack: (config) => {
    config.externals = [...config.externals, 'mysql2']
    return config
  },
  
  // Configuración de imágenes si usas next/image
  images: {
    domains: ['localhost'],
    // remotePatterns: [
    //   {
    //     protocol: 'http',
    //     hostname: 'localhost',
    //     port: '3000',
    //     pathname: '/uploads/**',
    //   },
    // ],
  },
  
  // Opcional: Para ignorar errores de ESLint durante el build (temporal)
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig