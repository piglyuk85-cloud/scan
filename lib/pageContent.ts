import { PageContent } from '@/types/pageContent'
import { prisma } from './prisma'

export async function getPageContent(): Promise<PageContent> {
  try {
    const pageContent = await prisma.pageContent.findUnique({
      where: { id: 'singleton' },
    })

    if (pageContent) {
      const parsed = JSON.parse(pageContent.content) as PageContent
      const defaultContent = getDefaultContent()
      return {
        home: {
          ...defaultContent.home,
          ...parsed.home,
          buttons: parsed.home?.buttons || defaultContent.home.buttons,
          sections: parsed.home?.sections || defaultContent.home.sections,
        },
        about: {
          ...defaultContent.about,
          ...parsed.about,
        },
        settings: {
          ...defaultContent.settings,
          ...parsed.settings,
          navigation: parsed.settings?.navigation || defaultContent.settings.navigation,
          catalog: parsed.settings?.catalog || defaultContent.settings.catalog,
          exhibit: parsed.settings?.exhibit || defaultContent.settings.exhibit,
          footer: {
            ...defaultContent.settings.footer,
            ...parsed.settings?.footer,
            navigationTitle: parsed.settings?.footer?.navigationTitle || defaultContent.settings.footer.navigationTitle,
            contactsTitle: parsed.settings?.footer?.contactsTitle || defaultContent.settings.footer.contactsTitle,
            contactsAddress: parsed.settings?.footer?.contactsAddress || defaultContent.settings.footer.contactsAddress,
          },
        },
      }
    }

    return getDefaultContent()
  } catch (error) {
    console.error('Ошибка чтения контента из БД:', error)
    return getDefaultContent()
  }
}

export async function savePageContent(content: PageContent): Promise<void> {
  try {
    await prisma.pageContent.upsert({
      where: { id: 'singleton' },
      update: {
        content: JSON.stringify(content),
      },
      create: {
        id: 'singleton',
        content: JSON.stringify(content),
      },
    })
  } catch (error) {
    console.error('Ошибка записи контента в БД:', error)
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
      buttons: {
        catalog: 'Каталог работ',
        virtualGallery: 'Виртуальная галерея',
        about: 'О галерее',
        viewAll: 'Смотреть все →',
        learnMore: 'Узнать больше',
      },
      sections: {
        popularWorks: 'Популярные работы',
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
        navigationTitle: 'Навигация',
        contactsTitle: 'Контакты',
        contactsAddress: 'ВГУ имени П.М. Машерова\nХудожественный факультет\nг. Витебск',
      },
      navigation: {
        home: 'Главная',
        catalog: 'Каталог',
        virtualGallery: 'Виртуальная галерея',
        camera: 'Камера',
        about: 'О галерее',
      },
      catalog: {
        title: 'Каталог работ',
        searchPlaceholder: 'Введите название, описание или имя автора...',
        searchLabel: 'Поиск',
        categoryLabel: 'Категория',
        yearLabel: 'Год создания',
        allCategories: 'Все категории',
        allYears: 'Все годы',
        only3D: 'Только с 3D моделями',
        foundWorks: 'Найдено работ',
        noWorksFound: 'Работы не найдены',
        tryDifferentFilters: 'Попробуйте изменить параметры поиска или фильтры',
      },
      exhibit: {
        backToCatalog: 'Вернуться в каталог',
        editButton: 'Редактировать',
        model3D: '3D Модель',
        description: 'Описание',
        aboutAuthor: 'Об авторе',
        additionalInfo: 'Дополнительная информация',
        creationInfo: 'Информация о создании',
        technicalSpecs: 'Технические характеристики',
        interestingFacts: 'Интересные факты',
        qrCode: 'QR-код',
        qrCodeDescription: 'Отсканируйте для быстрого доступа',
        navigation: 'Навигация',
        previous: 'Предыдущий',
        next: 'Следующий',
        creationDate: 'Дата создания',
        dimensions: 'Размеры',
        location: 'Местонахождение',
        inventoryNumber: 'Инвентарный номер',
        author: 'Автор/мастер',
        course: 'Курс',
        group: 'Группа',
        supervisor: 'Научный руководитель',
      },
    },
  }
}
