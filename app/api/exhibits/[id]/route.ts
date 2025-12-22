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

// GET - получить экспонат по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exhibits = await readExhibits()
    const exhibit = exhibits.find((e) => e.id === params.id)

    if (!exhibit) {
      return NextResponse.json(
        { error: 'Экспонат не найден' },
        { status: 404 }
      )
    }

    return NextResponse.json(exhibit)
  } catch (error) {
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
    const exhibits = await readExhibits()
    const index = exhibits.findIndex((e) => e.id === params.id)

    if (index === -1) {
      return NextResponse.json(
        { error: 'Экспонат не найден' },
        { status: 404 }
      )
    }

    // Валидация
    if (!updatedExhibit.title || !updatedExhibit.description || !updatedExhibit.category) {
      return NextResponse.json(
        { error: 'Заполните все обязательные поля' },
        { status: 400 }
      )
    }

    exhibits[index] = { ...updatedExhibit, id: params.id }
    await writeExhibits(exhibits)

    return NextResponse.json({ success: true, exhibit: exhibits[index] })
  } catch (error) {
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
    const exhibits = await readExhibits()
    const filteredExhibits = exhibits.filter((e) => e.id !== params.id)

    if (filteredExhibits.length === exhibits.length) {
      return NextResponse.json(
        { error: 'Экспонат не найден' },
        { status: 404 }
      )
    }

    await writeExhibits(filteredExhibits)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка при удалении экспоната' },
      { status: 500 }
    )
  }
}

