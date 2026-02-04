# Настройка Nginx для доступа по IP-адресу

Эта инструкция поможет настроить Nginx как reverse proxy, чтобы сайт был доступен по IP-адресу без указания порта.

## Шаг 1: Установка Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

## Шаг 2: Создание конфигурации

Создайте файл конфигурации:

```bash
sudo nano /etc/nginx/sites-available/museum-app
```

Скопируйте содержимое из файла `nginx-ip-config.conf` или вставьте следующее:

```nginx
server {
    listen 80;
    server_name _;

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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## Шаг 3: Активация конфигурации

```bash
# Создаем символическую ссылку
sudo ln -s /etc/nginx/sites-available/museum-app /etc/nginx/sites-enabled/

# Удаляем дефолтную конфигурацию (если она мешает)
sudo rm /etc/nginx/sites-enabled/default

# Проверяем конфигурацию на ошибки
sudo nginx -t

# Если проверка прошла успешно, перезагружаем Nginx
sudo systemctl reload nginx
```

## Шаг 4: Проверка работы

1. Убедитесь, что ваше Next.js приложение запущено на порту 3000:
   ```bash
   # Проверьте, что приложение работает
   curl http://localhost:3000
   ```

2. Проверьте доступ по IP:
   ```bash
   # Замените YOUR_IP на ваш IP-адрес
   curl http://YOUR_IP
   ```

3. Откройте в браузере: `http://YOUR_IP` (без порта 3000)

## Шаг 5: Настройка автозапуска (если еще не настроено)

Если ваше приложение не запускается автоматически при перезагрузке сервера, используйте PM2:

```bash
# Установка PM2
npm install -g pm2

# Запуск приложения
cd /path/to/your/project
pm2 start npm --name "museum-app" -- start

# Сохранение конфигурации
pm2 save

# Настройка автозапуска
pm2 startup
# Выполните команду, которую выведет PM2
```

## Управление Nginx

```bash
# Проверка статуса
sudo systemctl status nginx

# Перезапуск
sudo systemctl restart nginx

# Остановка
sudo systemctl stop nginx

# Запуск
sudo systemctl start nginx

# Просмотр логов
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Решение проблем

### Проблема: "502 Bad Gateway"

**Причина:** Next.js приложение не запущено или недоступно на порту 3000.

**Решение:**
```bash
# Проверьте, запущено ли приложение
ps aux | grep node

# Проверьте, слушает ли порт 3000
netstat -tlnp | grep 3000
# или
ss -tlnp | grep 3000

# Запустите приложение
cd /path/to/your/project
npm start
# или
pm2 start npm --name "museum-app" -- start
```

### Проблема: "Connection refused"

**Причина:** Nginx не может подключиться к localhost:3000.

**Решение:**
- Убедитесь, что приложение запущено
- Проверьте, что приложение слушает на `0.0.0.0:3000`, а не только на `127.0.0.1:3000`
- В Next.js это обычно настраивается автоматически

### Проблема: Порт 80 занят

**Причина:** Другое приложение использует порт 80.

**Решение:**
```bash
# Проверьте, что использует порт 80
sudo lsof -i :80
# или
sudo netstat -tlnp | grep :80

# Остановите конфликтующее приложение или измените его конфигурацию
```

## Дополнительно: Настройка файрвола

Если у вас включен файрвол (ufw), разрешите HTTP трафик:

```bash
# Разрешить HTTP (порт 80)
sudo ufw allow 80/tcp

# Разрешить HTTPS (порт 443, если будете настраивать SSL)
sudo ufw allow 443/tcp

# Проверка статуса
sudo ufw status
```

## В будущем: Настройка SSL (HTTPS)

Когда у вас появится домен, вы сможете настроить SSL:

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление
sudo certbot renew --dry-run
```

После настройки SSL обновите конфигурацию Nginx, заменив `server_name _;` на `server_name your-domain.com;`
