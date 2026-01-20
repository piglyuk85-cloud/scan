import { NextRequest, NextResponse } from 'next/server'
import { getPageContent, savePageContent } from '@/lib/pageContent'

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







