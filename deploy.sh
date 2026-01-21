#!/bin/bash

# Скрипт для деплоя на Debian 13
# Использование: ./deploy.sh

set -e

echo "🚀 Начинаем деплой виртуальной галереи..."

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Устанавливаем..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker установлен. Перезайдите в систему для применения изменений."
    exit 1
fi

# Проверяем наличие Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Устанавливаем..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose установлен."
fi

# Создаем необходимые директории
echo "📁 Создаем необходимые директории..."
mkdir -p public/models public/images storage qr-codes prisma/migrations

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "⚠️  Файл .env не найден. Создаем из .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Файл .env создан. Пожалуйста, отредактируйте его перед запуском."
    else
        echo "DATABASE_URL=\"file:./prisma/prod.db\"" > .env
        echo "NODE_ENV=production" >> .env
        echo "✅ Базовый .env файл создан."
    fi
fi

# Останавливаем существующие контейнеры
echo "🛑 Останавливаем существующие контейнеры..."
docker-compose -f docker-compose.prod.yml down || true

# Собираем и запускаем контейнеры
echo "🔨 Собираем Docker образ..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Запускаем миграции базы данных
echo "🗄️  Запускаем миграции базы данных..."
docker-compose -f docker-compose.prod.yml run --rm virtual-gallery npx prisma migrate deploy || true
docker-compose -f docker-compose.prod.yml run --rm virtual-gallery npx prisma generate || true

# Запускаем контейнеры
echo "🚀 Запускаем приложение..."
docker-compose -f docker-compose.prod.yml up -d

# Ждем запуска
echo "⏳ Ждем запуска приложения..."
sleep 10

# Проверяем статус
echo "📊 Статус контейнеров:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Деплой завершен!"
echo "🌐 Приложение доступно по адресу: http://localhost:3000"
echo ""
echo "Полезные команды:"
echo "  Просмотр логов: docker-compose -f docker-compose.prod.yml logs -f"
echo "  Остановка: docker-compose -f docker-compose.prod.yml down"
echo "  Перезапуск: docker-compose -f docker-compose.prod.yml restart"

