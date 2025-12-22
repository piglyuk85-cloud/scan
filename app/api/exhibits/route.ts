import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { Exhibit } from '@/types/exhibit'

const dataFilePath = path.join(process.cwd(), 'data', 'exhibits.json')

async function readExhibits(): Promise<Exhibit[]> {
  try {
    const data = await fs.readFile(dataFilePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

async function writeExhibits(exhibits: Exhibit[]): Promise<void> {
  await fs.writeFile(dataFilePath, JSON.stringify(exhibits, null, 2), 'utf-8')
}

// GET - получить все экспонаты
export async function GET() {
  try {
    const exhibits = await readExhibits()
    return NextResponse.json(exhibits)
  } catch (error) {
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

    const exhibits = await readExhibits()
    
    // Генерируем ID если не указан
    if (!exhibit.id) {
      exhibit.id = `exhibit-${Date.now()}`
    }

    // Проверяем уникальность ID
    if (exhibits.some((e) => e.id === exhibit.id)) {
      return NextResponse.json(
        { error: 'Экспонат с таким ID уже существует' },
        { status: 400 }
      )
    }

    exhibits.push(exhibit)
    await writeExhibits(exhibits)

    return NextResponse.json({ success: true, exhibit }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка при создании экспоната' },
      { status: 500 }
    )
  }
}

