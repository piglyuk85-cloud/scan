import { NextRequest, NextResponse } from 'next/server'
import { Exhibit } from '@/types/exhibit'
import { prisma } from '@/lib/prisma'

// GET - получить все экспонаты
export async function GET(request: NextRequest) {
  try {
    // Проверяем, является ли пользователь администратором (через заголовок или cookie)
    const isAdmin = request.headers.get('x-admin-auth') === 'true' || 
                    request.cookies.get('admin_auth')?.value === 'true'
    
    // Если не администратор, показываем только публичные экспонаты
    const whereClause = isAdmin ? {} : { isPublic: true }
    
    const exhibits = await prisma.exhibit.findMany({
      where: whereClause,
      include: { supervisor: true },
      orderBy: { createdAt: 'desc' },
    })

    const formattedExhibits: Exhibit[] = exhibits.map((exhibit) => ({
      id: exhibit.id,
      // Новые поля согласно структуре
      inventoryNumber: exhibit.inventoryNumber || undefined,
      title: exhibit.title,
      description: exhibit.description,
      fullDescription: exhibit.fullDescription || undefined,
      creationDate: exhibit.creationDate || undefined,
      studentName: exhibit.studentName || undefined,
      studentCourse: exhibit.studentCourse || undefined,
      studentGroup: exhibit.studentGroup || undefined,
      supervisorId: exhibit.supervisorId || undefined,
      supervisor: exhibit.supervisor ? {
        id: exhibit.supervisor.id,
        name: exhibit.supervisor.name,
        position: exhibit.supervisor.position || undefined,
        rank: exhibit.supervisor.rank || undefined,
        department: exhibit.supervisor.department || undefined,
      } : undefined,
      dimensions: exhibit.dimensions || undefined,
      currentLocation: exhibit.currentLocation || undefined,
      isPublic: exhibit.isPublic ?? undefined,
      // Дополнительные поля для совместимости
      category: exhibit.category,
      // Приоритет у creationDate, затем year для обратной совместимости
      year: exhibit.creationDate || exhibit.year || undefined,
      modelPath: exhibit.modelPath || undefined,
      has3DModel: exhibit.has3DModel,
      previewImage: exhibit.previewImage || undefined,
      images: JSON.parse(exhibit.images || '[]') as string[],
      creationInfo: exhibit.creationInfo || undefined,
      technicalSpecs: JSON.parse(exhibit.technicalSpecs || '{}') as Record<string, string>,
      interestingFacts: JSON.parse(exhibit.interestingFacts || '[]') as string[],
      relatedExhibits: JSON.parse(exhibit.relatedExhibits || '[]') as string[],
      galleryPositionX: exhibit.galleryPositionX ?? undefined,
      galleryPositionY: exhibit.galleryPositionY ?? undefined,
      galleryPositionZ: exhibit.galleryPositionZ ?? undefined,
      galleryScale: exhibit.galleryScale ?? undefined,
      galleryRotationY: exhibit.galleryRotationY ?? undefined,
      visibleInGallery: exhibit.visibleInGallery ?? undefined,
    }))

    return NextResponse.json(formattedExhibits)
  } catch (error) {
    console.error('Ошибка при загрузке экспонатов:', error)
    return NextResponse.json(
      { error: 'Ошибка при загрузке экспонатов' },
      { status: 500 }
    )
  }
}

// POST - создать новый экспонат
export async function POST(request: NextRequest) {
  try {
    const exhibit: Exhibit = await request.json()
    
    // Валидация
    if (!exhibit.title || !exhibit.description || !exhibit.category) {
      return NextResponse.json(
        { error: 'Заполните все обязательные поля' },
        { status: 400 }
      )
    }

    // Генерируем ID если не указан
    const exhibitId = exhibit.id || `exhibit-${Date.now()}`

    // Проверяем уникальность ID
    const existing = await prisma.exhibit.findUnique({
      where: { id: exhibitId },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Экспонат с таким ID уже существует' },
        { status: 400 }
      )
    }

    // Обрабатываем Supervisor: находим или создаем
    let supervisorId: string | null = null
    if (exhibit.supervisor?.name) {
      // Ищем существующего руководителя по имени
      let supervisor = await prisma.supervisor.findUnique({
        where: { name: exhibit.supervisor.name },
      })

      // Если не найден, создаем нового
      if (!supervisor) {
        supervisor = await prisma.supervisor.create({
          data: {
            name: exhibit.supervisor.name,
            position: exhibit.supervisor.position || null,
            rank: exhibit.supervisor.rank || null,
            department: exhibit.supervisor.department || null,
          },
        })
      }
      supervisorId = supervisor.id
    }

    const created = await prisma.exhibit.create({
      data: {
        id: exhibitId,
        // Новые поля согласно структуре
        inventoryNumber: exhibit.inventoryNumber || null,
        title: exhibit.title,
        description: exhibit.description,
        fullDescription: exhibit.fullDescription || '',
        creationDate: exhibit.creationDate || null,
        studentName: exhibit.studentName || null,
        studentCourse: exhibit.studentCourse || null,
        studentGroup: exhibit.studentGroup || null,
        supervisorId: supervisorId,
        dimensions: exhibit.dimensions || null,
        currentLocation: exhibit.currentLocation || null,
        isPublic: exhibit.isPublic ?? true,
        // Дополнительные поля для совместимости
        category: exhibit.category,
        // Синхронизируем year с creationDate для обратной совместимости
        year: exhibit.creationDate || exhibit.year || null,
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

    // Загружаем созданный экспонат с supervisor
    const createdWithSupervisor = await prisma.exhibit.findUnique({
      where: { id: created.id },
      include: { supervisor: true },
    })

    const formattedExhibit: Exhibit = {
      id: createdWithSupervisor!.id,
      // Новые поля согласно структуре
      inventoryNumber: createdWithSupervisor!.inventoryNumber || undefined,
      title: createdWithSupervisor!.title,
      description: createdWithSupervisor!.description,
      fullDescription: createdWithSupervisor!.fullDescription || undefined,
      creationDate: createdWithSupervisor!.creationDate || undefined,
      studentName: createdWithSupervisor!.studentName || undefined,
      studentCourse: createdWithSupervisor!.studentCourse || undefined,
      studentGroup: createdWithSupervisor!.studentGroup || undefined,
      supervisorId: createdWithSupervisor!.supervisorId || undefined,
      supervisor: createdWithSupervisor!.supervisor ? {
        id: createdWithSupervisor!.supervisor.id,
        name: createdWithSupervisor!.supervisor.name,
        position: createdWithSupervisor!.supervisor.position || undefined,
        rank: createdWithSupervisor!.supervisor.rank || undefined,
        department: createdWithSupervisor!.supervisor.department || undefined,
      } : undefined,
      dimensions: createdWithSupervisor!.dimensions || undefined,
      currentLocation: createdWithSupervisor!.currentLocation || undefined,
      isPublic: createdWithSupervisor!.isPublic ?? undefined,
      // Дополнительные поля для совместимости
      category: createdWithSupervisor!.category,
      year: createdWithSupervisor!.year || createdWithSupervisor!.creationDate || undefined,
      modelPath: createdWithSupervisor!.modelPath || undefined,
      has3DModel: createdWithSupervisor!.has3DModel,
      previewImage: createdWithSupervisor!.previewImage || undefined,
      images: JSON.parse(createdWithSupervisor!.images || '[]') as string[],
      creationInfo: createdWithSupervisor!.creationInfo || undefined,
      technicalSpecs: JSON.parse(createdWithSupervisor!.technicalSpecs || '{}') as Record<string, string>,
      interestingFacts: JSON.parse(createdWithSupervisor!.interestingFacts || '[]') as string[],
      relatedExhibits: JSON.parse(createdWithSupervisor!.relatedExhibits || '[]') as string[],
    }

    return NextResponse.json({ success: true, exhibit: formattedExhibit }, { status: 201 })
  } catch (error) {
    console.error('Ошибка при создании экспоната:', error)
    return NextResponse.json(
      { error: 'Ошибка при создании экспоната' },
      { status: 500 }
    )
  }
}
