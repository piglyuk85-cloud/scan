const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
    unoptimized: false,
    // Разрешаем загрузку изображений из public папки
    remotePatterns: [],
  },
  // В Next.js 14 serverActions включены по умолчанию
  // bodySizeLimit можно настроить через переменные окружения или другой механизм при необходимости
  webpack: (config) => {
    // Принудительный алиас для three.js, чтобы избежать дублирования бандлов
    config.resolve.alias = {
      ...config.resolve.alias,
      'three': path.resolve(__dirname, 'node_modules/three'),
    }
    return config
  },
}

module.exports = nextConfig
