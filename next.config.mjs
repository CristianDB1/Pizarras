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
      // Agregar cache para archivos subidos
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
  // Para evitar errores durante el build
  experimental: {
    esmExternals: 'loose'
  },
  // Si se usa MYSQL u otras dependencias server-only
  webpack: (config) => {
    config.externals = [...config.externals, 'mysql2']
    return config
  },
  // Opcional: Configurar límite de tamaño para API (útil para subida de imágenes)
  api: {
    bodyParser: {
      sizeLimit: '4mb', // Aumentar límite para imágenes Base64
    },
  },
}

export default nextConfig