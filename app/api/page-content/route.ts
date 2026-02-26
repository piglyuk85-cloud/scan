import { NextRequest, NextResponse } from 'next/server'
import { getPageContent, savePageContent } from '@/lib/pageContent'
import { getAdminFromRequest } from '@/lib/auth'

export async function GET() {
  try {
    const content = await getPageContent()
    return NextResponse.json(content)
  } catch (error) {
    console.error('Ошибка получения контента:', error)
    return NextResponse.json(
      { error: 'Ошибка получения контента' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const admin = await getAdminFromRequest(request)
  if (!admin || admin.role !== 'super') {
    return NextResponse.json({ error: 'Недостаточно прав для редактирования контента страниц' }, { status: 403 })
  }
  try {
    const body = await request.json()
    await savePageContent(body)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ошибка сохранения контента:', error)
    return NextResponse.json(
      { error: 'Ошибка сохранения контента' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request)
  if (!admin || admin.role !== 'super') {
    return NextResponse.json({ error: 'Недостаточно прав для редактирования контента страниц' }, { status: 403 })
  }
  try {
    const body = await request.json()
    await savePageContent(body)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ошибка сохранения контента:', error)
    return NextResponse.json(
      { error: 'Ошибка сохранения контента' },
      { status: 500 }
    )
  }
}







