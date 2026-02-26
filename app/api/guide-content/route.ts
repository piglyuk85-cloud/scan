import { NextRequest, NextResponse } from 'next/server'
import { getGuideContent, saveGuideContent, getDefaultGuideContent } from '@/lib/guideContent'
import type { GuideContentData } from '@/types/guide'
import { getAdminFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** Публичное чтение: возвращает контент из БД или контент по умолчанию */
export async function GET() {
  try {
    const content = await getGuideContent()
    const data = content ?? getDefaultGuideContent()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Ошибка получения руководства:', error)
    return NextResponse.json(
      { error: 'Ошибка получения руководства' },
      { status: 500 }
    )
  }
}

/** Сохранение: только для авторизованного супер-админа */
export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request)
  if (!admin || admin.role !== 'super') {
    return NextResponse.json(
      { error: 'Недостаточно прав для редактирования руководства' },
      { status: 403 }
    )
  }

  try {
    const body = (await request.json()) as GuideContentData
    if (!body || !Array.isArray(body.sections)) {
      return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
    }
    await saveGuideContent(body)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ошибка сохранения руководства:', error)
    return NextResponse.json(
      { error: 'Ошибка при сохранении руководства' },
      { status: 500 }
    )
  }
}
