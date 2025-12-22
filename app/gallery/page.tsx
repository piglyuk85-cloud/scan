'use client'

import { useState, useEffect } from 'react'
import VirtualGallery from '@/components/VirtualGallery'
import { Exhibit } from '@/types/exhibit'

export default function GalleryPage() {
  const [exhibits, setExhibits] = useState<Exhibit[]>([])
  const [loading, setLoading] = useState(true)

  const loadExhibits = async () => {
    try {
      // Загружаем данные через API, чтобы получать актуальные данные
      const response = await fetch('/api/exhibits')
      if (!response.ok) {
        throw new Error('Ошибка загрузки экспонатов')
      }
      const data: Exhibit[] = await response.json()
      
      // Фильтруем только экспонаты с 3D моделями и указанным путем
      const exhibitsWithModels = data.filter((ex) => ex.has3DModel && ex.modelPath)
      setExhibits(exhibitsWithModels)
    } catch (error) {
      console.error('Ошибка загрузки экспонатов:', error)
      setExhibits([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExhibits()

    // Автоматическое обновление при возврате фокуса на страницу
    const handleFocus = () => {
      loadExhibits()
    }

    // Автоматическое обновление каждые 30 секунд (опционально)
    const interval = setInterval(() => {
      loadExhibits()
    }, 30000)

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка виртуальной галереи...</p>
        </div>
      </div>
    )
  }

  if (exhibits.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-3xl font-bold mb-4 text-gray-800">
            Виртуальная галерея
          </h1>
          <p className="text-gray-600 mb-6">
            Нет экспонатов с 3D моделями для отображения в виртуальной галерее.
          </p>
          <p className="text-sm text-gray-500">
            Добавьте экспонаты с 3D моделями через админ-панель, чтобы они появились здесь.
          </p>
        </div>
      </div>
    )
  }

  return <VirtualGallery exhibits={exhibits} />
}

