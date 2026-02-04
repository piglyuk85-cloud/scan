# Быстрая настройка Nginx для доступа по IP без порта

## Пошаговая инструкция

### 1. Подключитесь к серверу по SSH

```bash
ssh user@your-server-ip
```

### 2. Установите Nginx (если еще не установлен)

```bash
sudo apt update
sudo apt install -y nginx
```

### 3. Создайте конфигурационный файл

```bash
sudo nano /etc/nginx/sites-available/museum-app
```

Вставьте следующую конфигурацию:

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

Сохраните файл: `Ctrl+O`, затем `Enter`, затем `Ctrl+X`

### 4. Активируйте конфигурацию

```bash
# Создаем символическую ссылку
sudo ln -s /etc/nginx/sites-available/museum-app /etc/nginx/sites-enabled/

# Удаляем дефолтную конфигурацию (если мешает)
sudo rm -f /etc/nginx/sites-enabled/default

# Проверяем конфигурацию на ошибки
sudo nginx -t
```

Если видите `syntax is ok` и `test is successful`, продолжайте.

### 5. Перезагрузите Nginx

```bash
sudo systemctl reload nginx
```

### 6. Проверьте, что приложение запущено на порту 3000

```bash
# Проверка, что приложение работает
curl http://localhost:3000

# Или проверьте процессы
ps aux | grep node
```

Если приложение не запущено, запустите его:

```bash
cd /path/to/your/project
npm start
# или если используете PM2:
pm2 start npm --name "museum-app" -- start
```

### 7. Настройте файрвол (если включен)

```bash
# Разрешить HTTP (порт 80)
sudo ufw allow 80/tcp

# Проверка статуса
sudo ufw status
```

### 8. Проверьте работу

Откройте в браузере: `http://YOUR_IP` (без `:3000`)

## Быстрая проверка

```bash
# Проверка статуса Nginx
sudo systemctl status nginx

# Проверка, что порт 80 слушается
sudo netstat -tlnp | grep :80
# или
sudo ss -tlnp | grep :80

# Проверка логов Nginx (если есть ошибки)
sudo tail -f /var/log/nginx/error.log
```

## Решение проблем

### Ошибка: "502 Bad Gateway"
- Убедитесь, что Next.js приложение запущено: `ps aux | grep node`
- Проверьте, что приложение слушает порт 3000: `netstat -tlnp | grep 3000`

### Ошибка: "Connection refused"
- Убедитесь, что приложение запущено и доступно на `localhost:3000`
- Проверьте, что в Next.js приложении нет ограничений на `0.0.0.0`

### Порт 80 занят
```bash
# Проверьте, что использует порт 80
sudo lsof -i :80
# Остановите конфликтующее приложение
```

## Полезные команды

```bash
# Перезапуск Nginx
sudo systemctl restart nginx

# Просмотр логов ошибок
sudo tail -f /var/log/nginx/error.log

# Просмотр логов доступа
sudo tail -f /var/log/nginx/access.log

# Проверка конфигурации
sudo nginx -t
```
