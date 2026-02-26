import { readFile } from 'fs/promises'
import path from 'path'
import { Exhibit } from '@/types/exhibit'
import { PageContent } from '@/types/pageContent'
import { prisma } from '@/lib/prisma'
import { createExhibitFromFlat } from '@/lib/exhibits'

/**
 * Скрипт для миграции данных из JSON файлов в БД (новая схема: Category, Student, Supervisor, Exhibit, MediaResource, GallerySettings).
 *
 * Использование:
 * 1. Поместите exhibits.json и pageContent.json в папку data/
 * 2. Запустите: npm run migrate:data
 */
async function migrateExhibits() {
  console.log('Миграция экспонатов...')

  const exhibitsPath = path.join(process.cwd(), 'data', 'exhibits.json')

  try {
    const exhibitsData = await readFile(exhibitsPath, 'utf-8')
    const exhibits: Exhibit[] = JSON.parse(exhibitsData)

    let migrated = 0
    let errors = 0

    for (const exhibit of exhibits) {
      try {
        const flat: Exhibit = {
          ...exhibit,
          creationDate: exhibit.creationDate || exhibit.year || undefined,
          supervisor:
            typeof exhibit.supervisor === 'string'
              ? { id: '', name: exhibit.supervisor }
              : exhibit.supervisor,
        }
        await createExhibitFromFlat(flat, exhibit.id)
        migrated++
        console.log(`✓ Мигрирован экспонат: ${exhibit.id}`)
      } catch (error) {
        errors++
        console.error(`✗ Ошибка при миграции экспоната ${exhibit.id}:`, error)
      }
    }

    console.log(`\nЭкспонаты: мигрировано ${migrated}, ошибок ${errors}`)
  } catch (error) {
    console.error('✗ Файл exhibits.json не найден или поврежден')
    console.error('  Убедитесь, что файл находится в папке data/exhibits.json')
    throw error
  }
}

async function migratePageContent() {
  console.log('\nМиграция контента страниц...')

  const pageContentPath = path.join(process.cwd(), 'data', 'pageContent.json')

  try {
    const pageContentData = await readFile(pageContentPath, 'utf-8')
    const pageContent: PageContent = JSON.parse(pageContentData)

    await prisma.pageContent.upsert({
      where: { id: 'singleton' },
      update: {
        content: JSON.stringify(pageContent),
      },
      create: {
        id: 'singleton',
        content: JSON.stringify(pageContent),
      },
    })
    console.log('✓ Контент страниц мигрирован')
  } catch (error) {
    console.error('✗ Файл pageContent.json не найден или поврежден')
    console.error('  Убедитесь, что файл находится в папке data/pageContent.json')
    throw error
  }
}

async function main() {
  try {
    await migrateExhibits()
    await migratePageContent()
    console.log('\n✅ Миграция завершена успешно!')
  } catch (error) {
    console.error('\n❌ Ошибка миграции:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
