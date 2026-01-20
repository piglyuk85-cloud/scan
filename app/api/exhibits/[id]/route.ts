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
        supervisor: updatedExhibit.supervisor || null,
        supervisorPosition: updatedExhibit.supervisorPosition || null,
        supervisorRank: updatedExhibit.supervisorRank || null,
        supervisorDepartment: updatedExhibit.supervisorDepartment || null,
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

    const formattedExhibit: Exhibit = {
      id: updated.id,
      // Новые поля согласно структуре
      inventoryNumber: updated.inventoryNumber || undefined,
      title: updated.title,
      description: updated.description,
      fullDescription: updated.fullDescription || undefined,
      creationDate: updated.creationDate || undefined,
      studentName: updated.studentName || undefined,
      studentCourse: updated.studentCourse || undefined,
      studentGroup: updated.studentGroup || undefined,
      supervisor: updated.supervisor || undefined,
      supervisorPosition: updated.supervisorPosition || undefined,
      supervisorRank: updated.supervisorRank || undefined,
      supervisorDepartment: updated.supervisorDepartment || undefined,
      dimensions: updated.dimensions || undefined,
      currentLocation: updated.currentLocation || undefined,
      isPublic: updated.isPublic ?? undefined,
      // Дополнительные поля для совместимости
      category: updated.category,
      // Синхронизируем year с creationDate для обратной совместимости
      year: updated.creationDate || updated.year || undefined,
      modelPath: updated.modelPath || undefined,
      has3DModel: updated.has3DModel,
      previewImage: updated.previewImage || undefined,
      images: JSON.parse(updated.images || '[]') as string[],
      creationInfo: updated.creationInfo || undefined,
      technicalSpecs: JSON.parse(updated.technicalSpecs || '{}') as Record<string, string>,
      interestingFacts: JSON.parse(updated.interestingFacts || '[]') as string[],
      relatedExhibits: JSON.parse(updated.relatedExhibits || '[]') as string[],
      galleryPositionX: updated.galleryPositionX ?? undefined,
      galleryPositionY: updated.galleryPositionY ?? undefined,
      galleryPositionZ: updated.galleryPositionZ ?? undefined,
      galleryScale: updated.galleryScale ?? undefined,
      galleryRotationY: updated.galleryRotationY ?? undefined,
      visibleInGallery: updated.visibleInGallery ?? undefined,
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
    // Проверяем, является ли пользователь супер-администратором
    const isAdmin = request.headers.get('x-admin-auth') === 'true' || 
                    request.cookies.get('admin_auth')?.value === 'true'
    const adminRole = request.headers.get('x-admin-role') || 
                      request.cookies.get('admin_role')?.value || 'admin'

    if (!isAdmin || adminRole !== 'super') {
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
