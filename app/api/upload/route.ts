import { NextRequest, NextResponse } from 'next/server'
import { writeFile, open } from 'fs/promises'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'

// Увеличиваем лимит размера тела запроса для загрузки больших 3D моделей (до 100MB)
export const maxDuration = 300 // 5 минут для больших файлов
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Логируем информацию о запросе для диагностики
    const contentLength = request.headers.get('content-length')
    const contentType = request.headers.get('content-type')
    console.log('Upload request:', {
      contentLength,
      contentType,
      hasBody: !!request.body,
    })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'model' или 'image'

    if (!file) {
      console.error('File not found in formData')
      return NextResponse.json(
        { error: 'Файл не загружен' },
        { status: 400 }
      )
    }

    console.log('File received:', {
      name: file.name,
      size: file.size,
      type: file.type,
    })

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

