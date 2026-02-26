import { prisma } from '@/lib/prisma'
import { createExhibitFromFlat } from '@/lib/exhibits'
import type { Exhibit } from '@/types/exhibit'

async function seed() {
  console.log('Создание тестовых данных...')

  const existingExhibits = await prisma.exhibit.count()
  if (existingExhibits > 0) {
    console.log(`В базе уже есть ${existingExhibits} экспонатов. Пропускаем создание тестовых данных.`)
    return
  }

  // Кафедра (для руководителей)
  const dept = await prisma.department.upsert({
    where: { id: 'dept-art' },
    update: {},
    create: { id: 'dept-art', name: 'Кафедра изобразительного искусства' },
  })

  // Научные руководители (по id, т.к. нет unique по name)
  const supervisor1 = await prisma.supervisor.upsert({
    where: { id: 'sup-1' },
    update: {},
    create: {
      id: 'sup-1',
      name: 'Петр Петров',
      position: 'Доцент',
      rank: 'Кандидат наук',
      departmentId: dept.id,
    },
  })
  console.log(`✓ Создан/найден научный руководитель: ${supervisor1.name}`)

  const supervisor2 = await prisma.supervisor.upsert({
    where: { id: 'sup-2' },
    update: {},
    create: {
      id: 'sup-2',
      name: 'Анна Смирнова',
      position: 'Профессор',
      rank: 'Доктор наук',
      departmentId: dept.id,
    },
  })
  console.log(`✓ Создан/найден научный руководитель: ${supervisor2.name}`)

  const exhibitsFlat: Exhibit[] = [
    {
      id: 'exhibit-1',
      title: 'Экспонат 1',
      description: 'Описание первого экспоната',
      fullDescription: 'Полное описание первого экспоната',
      category: 'Выставка',
      creationDate: '2024',
      studentName: 'Иван Иванов',
      studentCourse: '3',
      studentGroup: 'Группа 1',
      supervisor: { id: supervisor1.id, name: supervisor1.name, position: supervisor1.position ?? undefined, rank: supervisor1.rank ?? undefined },
      modelPath: '/models/model1-1764125921075.glb',
      has3DModel: true,
      previewImage: '/images/Снимок-1766367704588.PNG',
      images: ['/images/Снимок-1766367704588.PNG'],
    },
    {
      id: 'exhibit-2',
      title: 'Экспонат 2',
      description: 'Описание второго экспоната',
      fullDescription: 'Полное описание второго экспоната',
      category: 'Выставка',
      creationDate: '2024',
      studentName: 'Мария Сидорова',
      studentCourse: '4',
      studentGroup: 'Группа 2',
      supervisor: { id: supervisor2.id, name: supervisor2.name, position: supervisor2.position ?? undefined, rank: supervisor2.rank ?? undefined },
      modelPath: '/models/artifact3_03d3553c-ff27-49c5-a69c-d85541bc4f81-1766358821019.glb',
      has3DModel: true,
      previewImage: '/images/Снимок-1766367924459.PNG',
      images: ['/images/Снимок-1766367924459.PNG'],
    },
  ]

  for (const exhibit of exhibitsFlat) {
    await createExhibitFromFlat(exhibit, exhibit.id)
    console.log(`✓ Создан экспонат: ${exhibit.title}`)
  }

  const existingContent = await prisma.pageContent.findUnique({
    where: { id: 'singleton' },
  })

  if (!existingContent) {
    const defaultContent = {
      home: {
        hero: {
          title: 'Виртуальная галерея',
          subtitle: 'Художественный факультет ВГУ имени П.М. Машерова',
          description: 'Исследуйте студенческие работы в 3D',
        },
        aboutSection: {
          title: 'О виртуальной галерее',
          description1: 'Виртуальная галерея художественного факультета ВГУ имени П.М. Машерова представляет студенческие работы в интерактивном 3D формате. Каждая работа создана студентами факультета.',
          description2: 'Используйте свой смартфон для сканирования QR-кодов под работами и получите доступ к детальной информации об авторах, процессе создания и интерактивным 3D моделям студенческих произведений.',
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
          paragraphs: [
            'Виртуальная галерея художественного факультета ВГУ имени П.М. Машерова создана для демонстрации творческих работ студентов в современном цифровом формате.',
          ],
        },
        university: {
          title: 'ВГУ имени П.М. Машерова',
          paragraphs: [''],
        },
        howItWorks: {
          title: 'Как это работает',
          steps: [],
        },
        technologies: {
          title: '',
          description: '',
          items: [],
        },
        contacts: {
          title: '',
          items: [],
        },
      },
      settings: {
        siteName: 'ВГУ Галерея',
        siteDescription: 'Виртуальная галерея художественного факультета ВГУ имени П.М. Машерова - студенческие работы в 3D',
        footer: {
          description: 'Виртуальная галерея художественного факультета ВГУ имени П.М. Машерова',
          copyright: '© 2024',
          links: [
            { label: 'Главная', href: '/' },
            { label: 'Каталог', href: '/catalog' },
            { label: 'Виртуальная галерея', href: '/gallery' },
            { label: 'О галерее', href: '/about' },
          ],
          navigationTitle: 'Навигация',
          contactsTitle: 'Контакты',
          contactsAddress: 'ВГУ имени П.М. Машерова\nХудожественный факультет\nг. Витебск',
        },
        navigation: {
          home: 'Главная',
          catalog: 'Каталог',
          virtualGallery: 'Виртуальная галерея',
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

    await prisma.pageContent.create({
      data: {
        id: 'singleton',
        content: JSON.stringify(defaultContent),
      },
    })
    console.log('✓ Создан контент страниц')
  }

  console.log('\n✅ Тестовые данные созданы!')
}

seed()
  .catch((error) => {
    console.error('Ошибка при создании тестовых данных:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
