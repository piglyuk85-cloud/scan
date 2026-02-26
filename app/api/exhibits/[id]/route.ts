import { NextRequest, NextResponse } from 'next/server'
import { Exhibit } from '@/types/exhibit'
import { getExhibitById, updateExhibitFromFlat } from '@/lib/exhibits'
import { prisma } from '@/lib/prisma'
import { getAdminFromRequest } from '@/lib/auth'

// GET - получить экспонат по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getAdminFromRequest(request)
    const isAdmin = !!admin
    const exhibit = await getExhibitById(params.id, isAdmin)
    if (!exhibit) {
      return NextResponse.json({ error: 'Экспонат не найден' }, { status: 404 })
    }
    return NextResponse.json(exhibit)
  } catch (error) {
    console.error('Ошибка при загрузке экспоната:', error)
    return NextResponse.json({ error: 'Ошибка при загрузке экспоната' }, { status: 500 })
  }
}

// PUT - обновить экспонат (только для авторизованного админа)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = getAdminFromRequest(request)
  if (!admin) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
  }

  try {
    const id = params.id
    const updatedExhibit: Exhibit = await request.json()

    if (!updatedExhibit.title || !updatedExhibit.description || !updatedExhibit.category) {
      return NextResponse.json({ error: 'Заполните все обязательные поля' }, { status: 400 })
    }

    const existing = await prisma.exhibit.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Экспонат не найден' }, { status: 404 })
    }

    const exhibit = await updateExhibitFromFlat(id, { ...updatedExhibit, id })
    return NextResponse.json({ success: true, exhibit })
  } catch (error) {
    console.error('Ошибка при обновлении экспоната:', error)
    return NextResponse.json({ error: 'Ошибка при обновлении экспоната' }, { status: 500 })
  }
}

// DELETE - удалить экспонат (только для авторизованного админа)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = getAdminFromRequest(request)
  if (!admin) {
    return NextResponse.json({ error: 'Недостаточно прав для удаления экспонатов' }, { status: 403 })
  }

  try {
    const id = params.id
    const existing = await prisma.exhibit.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Экспонат не найден' }, { status: 404 })
    }

    await prisma.exhibit.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ошибка при удалении экспоната:', error)
    return NextResponse.json({ error: 'Ошибка при удалении экспоната' }, { status: 500 })
  }
}
