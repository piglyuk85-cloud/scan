import { NextRequest, NextResponse } from 'next/server'
import { Exhibit } from '@/types/exhibit'
import { prisma } from '@/lib/prisma'

// GET - получить экспонат по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем, является ли пользователь администратором
    const isAdmin = request.headers.get('x-admin-auth') === 'true' || 
                    request.cookies.get('admin_auth')?.value === 'true'
    
    const exhibit = await prisma.exhibit.findUnique({
      where: { id: params.id },
      include: { supervisor: true },
    })

    if (!exhibit) {
      return NextResponse.json(
        { error: 'Экспонат не найден' },
        { status: 404 }
      )
    }

    // Если экспонат не публичный и пользователь не админ - возвращаем 404
    if (!exhibit.isPublic && !isAdmin) {
      return NextResponse.json(
        { error: 'Экспонат не найден' },
        { status: 404 }
      )
    }

    const formattedExhibit: Exhibit = {
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
    }

    return NextResponse.json(formattedExhibit)
  } catch (error) {
    console.error('Ошибка при загрузке экспоната:', error)
    return NextResponse.json(
      { error: 'Ошибка при загрузке экспоната' },
      { status: 500 }
    )
  }
}

// PUT - обновить экспонат
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updatedExhibit: Exhibit = await request.json()

    // Валидация
    if (!updatedExhibit.title || !updatedExhibit.description || !updatedExhibit.category) {
      return NextResponse.json(
        { error: 'Заполните все обязательные поля' },
        { status: 400 }
      )
    }

    const existing = await prisma.exhibit.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Экспонат не найден' },
        { status: 404 }
      )
    }

    // Обрабатываем Supervisor: находим или создаем
    let supervisorId: string | null = null
    if (updatedExhibit.supervisor?.name) {
      // Ищем существующего руководителя по имени
      let supervisor = await prisma.supervisor.findUnique({
        where: { name: updatedExhibit.supervisor.name },
      })

      // Если не найден, создаем нового
      if (!supervisor) {
        supervisor = await prisma.supervisor.create({
          data: {
            name: updatedExhibit.supervisor.name,
            position: updatedExhibit.supervisor.position || null,
            rank: updatedExhibit.supervisor.rank || null,
            department: updatedExhibit.supervisor.department || null,
          },
        })
      }
      supervisorId = supervisor.id
    }

    const updated = await prisma.exhibit.update({
      where: { id: params.id },
      data: {
        // Новые поля согласно структуре
        inventoryNumber: updatedExhibit.inventoryNumber || null,
        title: updatedExhibit.title,
        description: updatedExhibit.description,
        fullDescription: updatedExhibit.fullDescription || '',
        creationDate: updatedExhibit.creationDate || null,
        studentName: updatedExhibit.studentName || null,
        studentCourse: updatedExhibit.studentCourse || null,
        studentGroup: updatedExhibit.studentGroup || null,
        supervisorId: supervisorId,
        dimensions: updatedExhibit.dimensions || null,
        currentLocation: updatedExhibit.currentLocation || null,
        isPublic: updatedExhibit.isPublic ?? true,
        // Дополнительные поля для совместимости
        category: updatedExhibit.category,
        // Синхронизируем year с creationDate для обратной совместимости
        year: updatedExhibit.creationDate || updatedExhibit.year || null,
        modelPath: updatedExhibit.modelPath || null,
        has3DModel: updatedExhibit.has3DModel || false,
        previewImage: updatedExhibit.previewImage || null,
        images: JSON.stringify(updatedExhibit.images || []),
        creationInfo: updatedExhibit.creationInfo || '',
        technicalSpecs: JSON.stringify(updatedExhibit.technicalSpecs || {}),
        interestingFacts: JSON.stringify(updatedExhibit.interestingFacts || []),
        relatedExhibits: JSON.stringify(updatedExhibit.relatedExhibits || []),
        galleryPositionX: updatedExhibit.galleryPositionX ?? null,
        galleryPositionY: updatedExhibit.galleryPositionY ?? null,
        galleryPositionZ: updatedExhibit.galleryPositionZ ?? null,
        galleryScale: updatedExhibit.galleryScale ?? null,
        galleryRotationY: updatedExhibit.galleryRotationY ?? null,
        visibleInGallery: updatedExhibit.visibleInGallery ?? true,
      },
    })

    // Загружаем обновленный экспонат с supervisor
    const updatedWithSupervisor = await prisma.exhibit.findUnique({
      where: { id: updated.id },
      include: { supervisor: true },
    })

    const formattedExhibit: Exhibit = {
      id: updatedWithSupervisor!.id,
      // Новые поля согласно структуре
      inventoryNumber: updatedWithSupervisor!.inventoryNumber || undefined,
      title: updatedWithSupervisor!.title,
      description: updatedWithSupervisor!.description,
      fullDescription: updatedWithSupervisor!.fullDescription || undefined,
      creationDate: updatedWithSupervisor!.creationDate || undefined,
      studentName: updatedWithSupervisor!.studentName || undefined,
      studentCourse: updatedWithSupervisor!.studentCourse || undefined,
      studentGroup: updatedWithSupervisor!.studentGroup || undefined,
      supervisorId: updatedWithSupervisor!.supervisorId || undefined,
      supervisor: updatedWithSupervisor!.supervisor ? {
        id: updatedWithSupervisor!.supervisor.id,
        name: updatedWithSupervisor!.supervisor.name,
        position: updatedWithSupervisor!.supervisor.position || undefined,
        rank: updatedWithSupervisor!.supervisor.rank || undefined,
        department: updatedWithSupervisor!.supervisor.department || undefined,
      } : undefined,
      dimensions: updatedWithSupervisor!.dimensions || undefined,
      currentLocation: updatedWithSupervisor!.currentLocation || undefined,
      isPublic: updatedWithSupervisor!.isPublic ?? undefined,
      // Дополнительные поля для совместимости
      category: updatedWithSupervisor!.category,
      // Синхронизируем year с creationDate для обратной совместимости
      year: updatedWithSupervisor!.creationDate || updatedWithSupervisor!.year || undefined,
      modelPath: updatedWithSupervisor!.modelPath || undefined,
      has3DModel: updatedWithSupervisor!.has3DModel,
      previewImage: updatedWithSupervisor!.previewImage || undefined,
      images: JSON.parse(updatedWithSupervisor!.images || '[]') as string[],
      creationInfo: updatedWithSupervisor!.creationInfo || undefined,
      technicalSpecs: JSON.parse(updatedWithSupervisor!.technicalSpecs || '{}') as Record<string, string>,
      interestingFacts: JSON.parse(updatedWithSupervisor!.interestingFacts || '[]') as string[],
      relatedExhibits: JSON.parse(updatedWithSupervisor!.relatedExhibits || '[]') as string[],
      galleryPositionX: updatedWithSupervisor!.galleryPositionX ?? undefined,
      galleryPositionY: updatedWithSupervisor!.galleryPositionY ?? undefined,
      galleryPositionZ: updatedWithSupervisor!.galleryPositionZ ?? undefined,
      galleryScale: updatedWithSupervisor!.galleryScale ?? undefined,
      galleryRotationY: updatedWithSupervisor!.galleryRotationY ?? undefined,
      visibleInGallery: updatedWithSupervisor!.visibleInGallery ?? undefined,
    }

    return NextResponse.json({ success: true, exhibit: formattedExhibit })
  } catch (error) {
    console.error('Ошибка при обновлении экспоната:', error)
    return NextResponse.json(
      { error: 'Ошибка при обновлении экспоната' },
      { status: 500 }
    )
  }
}

// DELETE - удалить экспонат
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем, является ли пользователь администратором
    const isAdmin = request.headers.get('x-admin-auth') === 'true' || 
                    request.cookies.get('admin_auth')?.value === 'true'
    const adminRole = request.headers.get('x-admin-role') || 
                      request.cookies.get('admin_role')?.value || 'admin'

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Недостаточно прав для удаления экспонатов' },
        { status: 403 }
      )
    }

    const existing = await prisma.exhibit.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Экспонат не найден' },
        { status: 404 }
      )
    }

    await prisma.exhibit.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ошибка при удалении экспоната:', error)
    return NextResponse.json(
      { error: 'Ошибка при удалении экспоната' },
      { status: 500 }
    )
  }
}
