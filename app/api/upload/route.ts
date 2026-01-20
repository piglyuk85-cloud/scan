import { NextRequest, NextResponse } from 'next/server'
import { writeFile, open } from 'fs/promises'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'model' или 'image'

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не загружен' },
        { status: 400 }
      )
    }

    // Определяем папку назначения
    const uploadDir =
      type === 'model'
        ? path.join(process.cwd(), 'storage', 'models')
        : path.join(process.cwd(), 'public', 'images')

    // Создаем папку если её нет
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true })
    }

    // Генерируем уникальное имя файла
    const timestamp = Date.now()
    const originalName = file.name
    const extension = path.extname(originalName)
    const baseName = path.basename(originalName, extension)
    const fileName = `${baseName}-${timestamp}${extension}`

    const filePath = path.join(uploadDir, fileName)

    // Сохраняем файл
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Принудительно синхронизируем запись на диск (fsync)
    try {
      const fd = await open(filePath, 'r+')
      await fd.sync()
      await fd.close()
    } catch (syncError) {
      console.warn('Не удалось синхронизировать файл на диск:', syncError)
    }

    // Проверяем, что файл действительно создан
    if (!existsSync(filePath)) {
      console.error('Файл не был создан:', filePath)
      return NextResponse.json(
        { error: 'Ошибка при сохранении файла' },
        { status: 500 }
      )
    }

    // Базовый путь относительно public
    const basePublicPath =
      type === 'model'
        ? `/api/storage/models/${fileName}`
        : `/images/${fileName}`

    const publicPath = basePublicPath

    console.log('Файл успешно загружен:', {
      originalName: file.name,
      fileName,
      filePath,
      publicPath,
      size: buffer.length,
    })

    return NextResponse.json({
      success: true,
      path: publicPath,
      fileName,
    })
  } catch (error) {
    console.error('Ошибка загрузки файла:', error)
    return NextResponse.json(
      { error: 'Ошибка при загрузке файла' },
      { status: 500 }
    )
  }
}

