import { PrismaClient } from '@prisma/client'
import { readFile } from 'fs/promises'
import path from 'path'
import { Exhibit } from '@/types/exhibit'
import { PageContent } from '@/types/pageContent'

// Инициализируем Prisma Client
const prisma = new PrismaClient()

/**
 * Скрипт для миграции данных из JSON файлов в БД
 * 
 * ВАЖНО: Этот скрипт требует наличия JSON файлов в папке data/
 * Если файлы отсутствуют, скрипт завершится с ошибкой.
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
        await prisma.exhibit.upsert({
          where: { id: exhibit.id },
          update: {
            title: exhibit.title,
            description: exhibit.description,
            fullDescription: exhibit.fullDescription || '',
            category: exhibit.category,
            year: exhibit.year || null,
            studentName: exhibit.studentName || null,
            studentCourse: exhibit.studentCourse || null,
            studentGroup: exhibit.studentGroup || null,
            supervisor: exhibit.supervisor || null,
            modelPath: exhibit.modelPath || null,
            has3DModel: exhibit.has3DModel || false,
            previewImage: exhibit.previewImage || null,
            images: JSON.stringify(exhibit.images || []),
            creationInfo: exhibit.creationInfo || '',
            technicalSpecs: JSON.stringify(exhibit.technicalSpecs || {}),
            interestingFacts: JSON.stringify(exhibit.interestingFacts || []),
            relatedExhibits: JSON.stringify(exhibit.relatedExhibits || []),
          },
          create: {
            id: exhibit.id,
            title: exhibit.title,
            description: exhibit.description,
            fullDescription: exhibit.fullDescription || '',
            category: exhibit.category,
            year: exhibit.year || null,
            studentName: exhibit.studentName || null,
            studentCourse: exhibit.studentCourse || null,
            studentGroup: exhibit.studentGroup || null,
            supervisor: exhibit.supervisor || null,
            modelPath: exhibit.modelPath || null,
            has3DModel: exhibit.has3DModel || false,
            previewImage: exhibit.previewImage || null,
            images: JSON.stringify(exhibit.images || []),
            creationInfo: exhibit.creationInfo || '',
            technicalSpecs: JSON.stringify(exhibit.technicalSpecs || {}),
            interestingFacts: JSON.stringify(exhibit.interestingFacts || []),
            relatedExhibits: JSON.stringify(exhibit.relatedExhibits || []),
          },
        })
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
    console.error('\nПримечание: Проект теперь работает исключительно с БД.')
    console.error('JSON файлы используются только для первоначальной миграции данных.')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
