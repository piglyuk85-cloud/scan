# Инструкция по деплою на Debian 13

## Требования

- Debian 13 (или более новая версия)
- Минимум 2GB RAM
- Минимум 10GB свободного места на диске
- Доступ к интернету

## Быстрый старт

### 1. Подготовка сервера

```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем необходимые пакеты
sudo apt install -y curl git build-essential
```

### 2. Клонирование проекта

```bash
# Клонируем репозиторий (замените на ваш репозиторий)
git clone <your-repo-url> museum-app
cd museum-app
```

### 3. Настройка окружения

```bash
# Копируем пример файла окружения
cp .env.example .env

# Редактируем .env файл (при необходимости)
nano .env
```

### 4. Деплой

```bash
# Делаем скрипт исполняемым
chmod +x deploy.sh

# Запускаем деплой
./deploy.sh
```

## Ручной деплой (без скрипта)

### 1. Установка Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh
```

**Важно:** После установки Docker перезайдите в систему или выполните:
```bash
newgrp docker
```

### 2. Установка Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Сборка и запуск

```bash
# Создаем необходимые директории
mkdir -p public/models public/images storage qr-codes

# Собираем образ
docker-compose -f docker-compose.prod.yml build

# Запускаем миграции
docker-compose -f docker-compose.prod.yml run --rm virtual-gallery npx prisma migrate deploy
docker-compose -f docker-compose.prod.yml run --rm virtual-gallery npx prisma generate

# Запускаем приложение
docker-compose -f docker-compose.prod.yml up -d
```

## Настройка Nginx (опционально)

Если вы хотите использовать Nginx как reverse proxy:

### 1. Установка Nginx

```bash
sudo apt install -y nginx
```

### 2. Создание конфигурации

```bash
sudo nano /etc/nginx/sites-available/museum-app
```

Добавьте следующую конфигурацию:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Активация конфигурации

```bash
sudo ln -s /etc/nginx/sites-available/museum-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Настройка SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Управление приложением

### Просмотр логов

```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Остановка приложения

```bash
docker-compose -f docker-compose.prod.yml down
```

### Перезапуск приложения

```bash
docker-compose -f docker-compose.prod.yml restart
```

### Обновление приложения

```bash
# Получаем последние изменения
git pull

# Пересобираем и перезапускаем
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Резервное копирование базы данных

```bash
# Создаем резервную копию
cp prisma/prod.db prisma/prod.db.backup.$(date +%Y%m%d_%H%M%S)

# Восстановление из резервной копии
cp prisma/prod.db.backup.YYYYMMDD_HHMMSS prisma/prod.db
docker-compose -f docker-compose.prod.yml restart
```

## Структура директорий

```
museum-app/
├── prisma/              # База данных SQLite
│   ├── prod.db         # Production база данных
│   └── migrations/     # Миграции
├── public/
│   ├── models/         # 3D модели
│   └── images/         # Изображения
├── storage/            # Загруженные файлы
└── qr-codes/           # QR-коды
```

## Мониторинг

### Проверка статуса контейнеров

```bash
docker-compose -f docker-compose.prod.yml ps
```

### Использование ресурсов

```bash
docker stats
```

## Решение проблем

### Приложение не запускается

1. Проверьте логи: `docker-compose -f docker-compose.prod.yml logs`
2. Проверьте, что порт 3000 свободен: `sudo netstat -tulpn | grep 3000`
3. Проверьте права доступа к директориям

### Проблемы с базой данных

```bash
# Пересоздаем базу данных (ВНИМАНИЕ: удалит все данные!)
docker-compose -f docker-compose.prod.yml run --rm virtual-gallery npx prisma migrate reset
```

### Очистка Docker

```bash
# Удаляем неиспользуемые образы
docker system prune -a

# Удаляем все контейнеры и образы проекта
docker-compose -f docker-compose.prod.yml down -v
```

## Безопасность

1. **Измените пароли администраторов** в коде перед деплоем
2. **Настройте firewall:**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
3. **Регулярно обновляйте систему:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

## Поддержка

При возникновении проблем проверьте:
- Логи приложения: `docker-compose -f docker-compose.prod.yml logs`
- Логи системы: `journalctl -xe`
- Статус Docker: `sudo systemctl status docker`

