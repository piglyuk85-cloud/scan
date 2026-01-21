# Виртуальная галерея ВГУ

Виртуальная 3D галерея для художественного факультета ВГУ имени П.М. Машерова.

## Технологии

- **Next.js 14** - React фреймворк
- **Three.js / React Three Fiber** - 3D графика
- **Prisma** - ORM для работы с базой данных
- **SQLite** - База данных
- **TypeScript** - Типизация
- **Tailwind CSS** - Стилизация

## Быстрый старт

### Локальная разработка

```bash
# Установка зависимостей
npm install

# Настройка базы данных
npx prisma generate
npx prisma migrate dev

# Запуск в режиме разработки
npm run dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000)

### Деплой на сервер

См. [DEPLOY.md](./DEPLOY.md) для подробных инструкций по деплою на Debian 13.

## Структура проекта

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── admin/             # Админ-панель
│   ├── catalog/           # Каталог экспонатов
│   ├── gallery/           # Виртуальная галерея
│   └── exhibit/           # Страницы экспонатов
├── components/            # React компоненты
│   ├── admin/            # Компоненты админ-панели
│   └── ...               # Остальные компоненты
├── lib/                   # Утилиты и библиотеки
├── prisma/                # Prisma схема и миграции
├── public/                # Статические файлы
│   ├── models/           # 3D модели
│   └── images/           # Изображения
└── scripts/              # Скрипты
```

## Административные аккаунты

- **Admin**: логин `admin`, пароль `adminvsu2025`
- **Super-admin**: логин `super`, пароль `12281992`

⚠️ **Важно**: Измените пароли перед деплоем в production!

## Основные команды

```bash
# Разработка
npm run dev

# Сборка
npm run build

# Запуск production
npm start

# Работа с базой данных
npm run db:generate      # Генерация Prisma Client
npm run db:migrate       # Запуск миграций (dev)
npm run db:migrate:deploy # Запуск миграций (production)
npm run db:studio        # Prisma Studio

# Генерация QR-кодов
npm run generate-qr
```

## Docker

### Разработка

```bash
docker-compose up
```

### Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Лицензия

Проект разработан для ВГУ имени П.М. Машерова.




