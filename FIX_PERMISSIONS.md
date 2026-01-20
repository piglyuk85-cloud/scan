# Исправление прав доступа на сервере

## Проблема
Изменения в админ-панели не сохраняются из-за отсутствия прав на запись в папку `data/`.

## Решение через консоль сервера

### Шаг 1: Подключитесь к серверу

```bash
ssh root@ваш-ip-адрес
```

Или используйте VNC консоль в панели hoster.by.

### Шаг 2: Перейдите в папку проекта

```bash
cd /var/www/virtual-gallery
```

### Шаг 3: Проверьте текущие права

```bash
ls -la data/
```

Должны увидеть что-то вроде:
```
-rw-r--r-- 1 root root 1234 exhibits.json
-rw-r--r-- 1 root root 5678 pageContent.json
```

### Шаг 4: Измените права доступа

```bash
# Даем права на чтение и запись владельцу и группе
chmod 664 data/exhibits.json
chmod 664 data/pageContent.json

# Или для всей папки data
chmod 755 data/
chmod 664 data/*.json
```

### Шаг 5: Проверьте владельца файлов

```bash
# Узнайте, под каким пользователем работает Node.js
ps aux | grep node
```

Обычно это `root` или `www-data`. Если файлы принадлежат другому пользователю:

```bash
# Если Node.js работает от root (обычно так)
chown root:root data/exhibits.json
chown root:root data/pageContent.json

# Или если от www-data
chown www-data:www-data data/exhibits.json
chown www-data:www-data data/pageContent.json
```

### Шаг 6: Проверьте, что папка существует и доступна

```bash
# Проверьте существование папки
ls -la | grep data

# Если папки нет, создайте
mkdir -p data
chmod 755 data
```

### Шаг 7: Проверьте права на запись

```bash
# Попробуйте создать тестовый файл
touch data/test.txt
rm data/test.txt
```

Если команда `touch` выполнилась без ошибок, права настроены правильно.

### Шаг 8: Перезапустите приложение

```bash
# Если используете PM2
pm2 restart virtual-gallery

# Или если запущено через npm start
# Остановите (Ctrl+C) и запустите снова
npm start
```

## Полная команда для быстрого исправления

Выполните все команды одной строкой:

```bash
cd /var/www/virtual-gallery && \
mkdir -p data && \
chmod 755 data && \
chmod 664 data/*.json 2>/dev/null || true && \
chown root:root data/*.json 2>/dev/null || true && \
pm2 restart virtual-gallery
```

## Проверка после исправления

1. Откройте админ-панель в браузере
2. Попробуйте изменить экспонат или контент страницы
3. Сохраните изменения
4. Проверьте, что изменения сохранились

## Если проблема осталась

### Проверьте логи

```bash
# Логи PM2
pm2 logs virtual-gallery --lines 50

# Или логи Next.js (если запущено напрямую)
# Смотрите вывод в консоли где запущен npm start
```

### Проверьте права еще раз

```bash
# Детальная информация о правах
stat data/exhibits.json
stat data/pageContent.json
```

### Проверьте, что файлы действительно изменяются

```bash
# Посмотрите время изменения файла до сохранения
ls -la data/exhibits.json

# Сохраните что-то в админ-панели

# Проверьте время изменения после сохранения
ls -la data/exhibits.json
```

Если время не изменилось, значит файл не записывается.

## Альтернативное решение: SELinux (если используется)

Если на сервере включен SELinux, может потребоваться:

```bash
# Проверьте статус SELinux
getenforce

# Если Enforcing, временно отключите для теста
setenforce 0

# Или настройте контекст для папки
chcon -R -t httpd_sys_rw_content_t data/
```

## Дополнительная диагностика

Если ничего не помогает, проверьте:

```bash
# Доступное место на диске
df -h

# Права на родительские папки
ls -la /var/www/
ls -la /var/

# Проверьте, что процесс Node.js имеет права
ps aux | grep node
```

---

**После исправления прав доступа изменения должны сохраняться!**







