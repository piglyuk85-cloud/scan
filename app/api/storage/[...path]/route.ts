// API endpoint для отдачи файлов из storage директории

import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Безопасность: проверяем, что путь не выходит за пределы storage
    const filePath = path.join(process.cwd(), 'storage', ...params.path)
    const storageRoot = path.join(process.cwd(), 'storage')
    
    // Проверяем, что файл находится внутри storage
    if (!filePath.startsWith(storageRoot)) {
      return NextResponse.json(
        { error: 'Недопустимый путь' },
        { status: 403 }
      )
    }

    if (!existsSync(filePath)) {
      console.error(`Файл не найден: ${filePath}`)
      // Для бинарных файлов возвращаем 404 без JSON, чтобы не ломать загрузчики
      if (['.glb', '.gltf', '.obj', '.ply', '.jpg', '.jpeg', '.png'].some(ext => filePath.toLowerCase().endsWith(ext))) {
        return new NextResponse('File not found', { status: 404 })
      }
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 404 }
      )
    }

    // Читаем файл
    const fileBuffer = await readFile(filePath)
    
    // Определяем MIME тип
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.glb': 'model/gltf-binary',
      '.gltf': 'model/gltf+json',
      '.obj': 'model/obj',
      '.ply': 'model/ply', // PLY формат для 3D моделей
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.json': 'application/json',
    }
    
    const contentType = mimeTypes[ext] || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Ошибка при чтении файла:', error)
    return NextResponse.json(
      { error: 'Ошибка при чтении файла' },
      { status: 500 }
    )
  }
}





