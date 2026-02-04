-- Скрипт для исправления проблемы с миграцией normalize_supervisor_to_3nf
-- Используйте этот скрипт, если миграция упала с ошибкой UNIQUE constraint

-- Проверяем, существует ли таблица Supervisor
-- Если существует и есть дубликаты, удаляем их

-- Удаляем дубликаты из Supervisor, оставляя только первую запись для каждого имени
DELETE FROM "Supervisor"
WHERE "id" NOT IN (
    SELECT MIN("id")
    FROM "Supervisor"
    GROUP BY "name"
);

-- Если таблица Supervisor не существует, создаем её
CREATE TABLE IF NOT EXISTS "Supervisor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "rank" TEXT,
    "department" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Если таблица существует, но нет уникального индекса, создаем его
CREATE UNIQUE INDEX IF NOT EXISTS "Supervisor_name_key" ON "Supervisor"("name");
CREATE INDEX IF NOT EXISTS "Supervisor_name_idx" ON "Supervisor"("name");

-- Если в таблице Exhibit еще нет supervisorId, но есть старые поля supervisor
-- (это означает, что миграция не завершилась)
-- Нужно будет применить миграцию заново после исправления Supervisor
