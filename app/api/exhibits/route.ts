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
      supervisor: exhibit.supervisor || undefined,
      supervisorPosition: exhibit.supervisorPosition || undefined,
      supervisorRank: exhibit.supervisorRank || undefined,
      supervisorDepartment: exhibit.supervisorDepartment || undefined,
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
        supervisor: exhibit.supervisor || null,
        supervisorPosition: exhibit.supervisorPosition || null,
        supervisorRank: exhibit.supervisorRank || null,
        supervisorDepartment: exhibit.supervisorDepartment || null,
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

    const formattedExhibit: Exhibit = {
      id: created.id,
      // Новые поля согласно структуре
      inventoryNumber: created.inventoryNumber || undefined,
      title: created.title,
      description: created.description,
      fullDescription: created.fullDescription || undefined,
      creationDate: created.creationDate || undefined,
      studentName: created.studentName || undefined,
      studentCourse: created.studentCourse || undefined,
      studentGroup: created.studentGroup || undefined,
      supervisor: created.supervisor || undefined,
      supervisorPosition: created.supervisorPosition || undefined,
      supervisorRank: created.supervisorRank || undefined,
      supervisorDepartment: created.supervisorDepartment || undefined,
      dimensions: created.dimensions || undefined,
      currentLocation: created.currentLocation || undefined,
      isPublic: created.isPublic ?? undefined,
      // Дополнительные поля для совместимости
      category: created.category,
      year: created.year || created.creationDate || undefined,
      modelPath: created.modelPath || undefined,
      has3DModel: created.has3DModel,
      previewImage: created.previewImage || undefined,
      images: JSON.parse(created.images || '[]') as string[],
      creationInfo: created.creationInfo || undefined,
      technicalSpecs: JSON.parse(created.technicalSpecs || '{}') as Record<string, string>,
      interestingFacts: JSON.parse(created.interestingFacts || '[]') as string[],
      relatedExhibits: JSON.parse(created.relatedExhibits || '[]') as string[],
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
