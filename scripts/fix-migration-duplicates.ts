import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixMigrationDuplicates() {
  try {
    console.log('🔍 Проверяем состояние базы данных...')

    // Проверяем, существует ли таблица Supervisor
    const supervisorExists = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master WHERE type='table' AND name='Supervisor'
    ` as Array<{ name: string }>

    if (supervisorExists.length === 0) {
      console.log('✅ Таблица Supervisor не существует. Можно применять миграцию.')
      return
    }

    console.log('⚠️  Таблица Supervisor уже существует. Проверяем дубликаты...')

    // Проверяем дубликаты
    const duplicates = await prisma.$queryRaw<Array<{ name: string; count: bigint }>>`
      SELECT name, COUNT(*) as count
      FROM Supervisor
      GROUP BY name
      HAVING COUNT(*) > 1
    ` as Array<{ name: string; count: bigint }>

    if (duplicates.length === 0) {
      console.log('✅ Дубликатов не найдено. Таблица Supervisor в порядке.')
      return
    }

    console.log(`⚠️  Найдено ${duplicates.length} имен с дубликатами:`)
    duplicates.forEach(d => {
      console.log(`   - ${d.name}: ${Number(d.count)} записей`)
    })

    console.log('🔧 Удаляем дубликаты, оставляя только первую запись для каждого имени...')

    // Удаляем дубликаты, оставляя только первую запись (с минимальным id)
    await prisma.$executeRaw`
      DELETE FROM Supervisor
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM Supervisor
        GROUP BY name
      )
    `

    // Проверяем результат
    const remainingDuplicates = await prisma.$queryRaw<Array<{ name: string; count: bigint }>>`
      SELECT name, COUNT(*) as count
      FROM Supervisor
      GROUP BY name
      HAVING COUNT(*) > 1
    ` as Array<{ name: string; count: bigint }>

    if (remainingDuplicates.length === 0) {
      console.log('✅ Дубликаты успешно удалены!')
      
      // Проверяем уникальный индекс
      const indexExists = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name='Supervisor_name_key'
      ` as Array<{ name: string }>

      if (indexExists.length === 0) {
        console.log('🔧 Создаем уникальный индекс на поле name...')
        await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS Supervisor_name_key ON Supervisor(name)`
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS Supervisor_name_idx ON Supervisor(name)`
        console.log('✅ Индексы созданы.')
      }

      console.log('✅ База данных готова к применению миграции!')
    } else {
      console.error('❌ Ошибка: не удалось удалить все дубликаты')
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Ошибка при исправлении миграции:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

fixMigrationDuplicates()
