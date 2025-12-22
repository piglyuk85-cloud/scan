/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
    unoptimized: false,
    // Разрешаем загрузку изображений из public папки
    remotePatterns: [],
  },
  // Увеличиваем лимит размера загружаемых файлов для 3D моделей
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
