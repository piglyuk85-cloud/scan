import { promises as fs } from 'fs'
import path from 'path'
import { PageContent } from '@/types/pageContent'

const filePath = path.join(process.cwd(), 'data', 'pageContent.json')

export async function getPageContent(): Promise<PageContent> {
  try {
    const fileContents = await fs.readFile(filePath, 'utf8')
    return JSON.parse(fileContents)
  } catch (error) {
    console.error('Ошибка чтения pageContent.json:', error)
    // Возвращаем дефолтные значения
    return getDefaultContent()
  }
}

export async function savePageContent(content: PageContent): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8')
  } catch (error) {
    console.error('Ошибка записи pageContent.json:', error)
    throw new Error('Не удалось сохранить контент')
  }
}

function getDefaultContent(): PageContent {
  return {
    home: {
      hero: {
        title: 'Виртуальная галерея',
        subtitle: 'Художественный факультет ВГУ имени П.М. Машерова',
        description: 'Исследуйте студенческие работы в 3D, сканируя QR-коды',
      },
      aboutSection: {
        title: 'О виртуальной галерее',
        description1: 'Виртуальная галерея художественного факультета ВГУ имени П.М. Машерова представляет студенческие работы в интерактивном 3D формате.',
        description2: 'Используйте свой смартфон для сканирования QR-кодов под работами.',
      },
      stats: {
        works: 'Работ',
        models: 'Модели',
        qrCodes: 'Коды',
        access: 'Доступ',
      },
    },
    about: {
      project: {
        title: 'О проекте',
        paragraphs: ['Описание проекта'],
      },
      university: {
        title: 'ВГУ имени П.М. Машерова',
        paragraphs: ['Описание университета'],
      },
      howItWorks: {
        title: 'Как это работает',
        steps: [],
      },
      technologies: {
        title: 'Технологии',
        description: 'Описание технологий',
        items: [],
      },
      contacts: {
        title: 'Контакты',
        items: [],
      },
    },
    settings: {
      siteName: 'ВГУ Галерея',
      siteDescription: 'Виртуальная галерея',
      footer: {
        description: 'Описание',
        copyright: '© 2024',
        links: [],
      },
    },
  }
}

