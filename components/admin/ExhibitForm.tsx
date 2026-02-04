'use client'

import { useState, useEffect, useRef } from 'react'
import { Exhibit } from '@/types/exhibit'

interface ExhibitFormProps {
  exhibit?: Exhibit | null
  onSubmit: () => void
  onCancel: () => void
  userRole?: 'admin' | 'super' | null
}

export default function ExhibitForm({ exhibit, onSubmit, onCancel, userRole }: ExhibitFormProps) {
  const [formData, setFormData] = useState<Partial<Exhibit>>({
    inventoryNumber: '',
    title: '',
    description: '',
    fullDescription: '',
    creationDate: '',
    studentName: '',
    studentCourse: '',
    studentGroup: '',
    supervisor: {
      id: '',
      name: '',
      position: '',
      rank: '',
      department: '',
    },
    dimensions: '',
    currentLocation: '',
    isPublic: true,
    category: '',
    year: '',
    has3DModel: false,
    modelPath: '',
    previewImage: '',
    images: [],
    creationInfo: '',
    technicalSpecs: {},
    interestingFacts: [],
  })

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const modelFileRef = useRef<HTMLInputElement>(null)
  const imageFileRef = useRef<HTMLInputElement>(null)
  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current)
        progressTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (exhibit) {
      setFormData({
        ...exhibit,
        year: exhibit.creationDate || exhibit.year || '',
        supervisor: exhibit.supervisor || {
          id: '',
          name: '',
          position: '',
          rank: '',
          department: '',
        },
      })
    }
  }, [exhibit])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }))
    } else if (name.startsWith('supervisor.')) {
      // Обработка полей supervisor
      const field = name.split('.')[1] as 'name' | 'position' | 'rank' | 'department'
      setFormData((prev) => ({
        ...prev,
        supervisor: {
          ...(prev.supervisor || { id: '', name: '', position: '', rank: '', department: '' }),
          [field]: value,
        },
      }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleFileUpload = async (
    file: File,
    type: 'model' | 'image'
  ): Promise<string | null> => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Ошибка загрузки файла')
      }

      const data = await response.json()
      return data.path
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      alert('Ошибка при загрузке файла')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadProgress('Загрузка 3D модели...')
    const path = await handleFileUpload(file, 'model')
    if (path) {
      setFormData((prev) => ({
        ...prev,
        modelPath: path,
        has3DModel: true,
      }))
      setUploadProgress('3D модель успешно загружена')
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current)
      }
      progressTimeoutRef.current = setTimeout(() => setUploadProgress(''), 3000)
    } else {
      setUploadProgress('')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadProgress('Загрузка изображения...')
    const path = await handleFileUpload(file, 'image')
    if (path) {
      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), path],
        previewImage: prev.previewImage || path,
      }))
      setUploadProgress('Изображение успешно загружено')
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current)
      }
      progressTimeoutRef.current = setTimeout(() => setUploadProgress(''), 3000)
    } else {
      setUploadProgress('')
    }
  }

  const handleSetPreview = (path: string) => {
    setFormData((prev) => ({ ...prev, previewImage: path }))
  }

  const handleRemoveImage = (path: string) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images?.filter((img) => img !== path) || [],
      previewImage: prev.previewImage === path ? '' : prev.previewImage,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    try {
      const url = exhibit ? `/api/exhibits/${exhibit.id}` : '/api/exhibits'
      const method = exhibit ? 'PUT' : 'POST'

      const dataToSend = {
        ...formData,
        year: formData.creationDate || formData.year || '',
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка сохранения')
      }

      alert(exhibit ? 'Работа обновлена' : 'Работа создана')
      onSubmit()
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      alert('Ошибка при сохранении работы. Проверьте консоль для деталей.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {exhibit ? 'Редактировать экспонат' : 'Добавить новый экспонат'}
      </h2>

      {uploadProgress && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-lg">
          {uploadProgress}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Учетный инвентарный номер фонда/музея */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            1. Учетный инвентарный номер фонда/музея
          </label>
          <input
            type="text"
            name="inventoryNumber"
            value={formData.inventoryNumber || ''}
            onChange={handleChange}
            placeholder="Введите инвентарный номер"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* 2. Краткое название экспоната */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            2. Краткое название экспоната <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        {/* 3. Текст для превью/карточки (2-3 предложения) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            3. Текст для превью/карточки (2-3 предложения) <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows={3}
            placeholder="Введите краткое описание для карточки экспоната (2-3 предложения)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        {/* 4. Полное описание: история создания, стилистика, символика */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            4. Полное описание: история создания, стилистика, символика
          </label>
          <textarea
            name="fullDescription"
            value={formData.fullDescription || ''}
            onChange={handleChange}
            rows={8}
            placeholder="Введите полное описание экспоната: история создания, стилистика, символика..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* 5. Дата создания */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            5. Дата создания
          </label>
          <input
            type="text"
            name="creationDate"
            value={formData.creationDate || ''}
            onChange={handleChange}
            placeholder="Например: 2024 год или 2023-2024"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* 6. Автор/мастер (ФИО, курс, группа) */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            6. Автор/мастер (ФИО, курс, группа)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ФИО
              </label>
              <input
                type="text"
                name="studentName"
                value={formData.studentName || ''}
                onChange={handleChange}
                placeholder="Иванов Иван Иванович"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Курс
              </label>
              <input
                type="text"
                name="studentCourse"
                value={formData.studentCourse || ''}
                onChange={handleChange}
                placeholder="3 курс"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Группа
              </label>
              <input
                type="text"
                name="studentGroup"
                value={formData.studentGroup || ''}
                onChange={handleChange}
                placeholder="ХД-31"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* 7. Научный руководитель (ФИО, должность, звание, кафедра) */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            7. Научный руководитель (ФИО, должность, звание, кафедра)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ФИО
              </label>
              <input
                type="text"
                name="supervisor.name"
                value={formData.supervisor?.name || ''}
                onChange={handleChange}
                placeholder="Петров Петр Петрович"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Должность
              </label>
              <input
                type="text"
                name="supervisor.position"
                value={formData.supervisor?.position || ''}
                onChange={handleChange}
                placeholder="Доцент"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Звание
              </label>
              <input
                type="text"
                name="supervisor.rank"
                value={formData.supervisor?.rank || ''}
                onChange={handleChange}
                placeholder="Кандидат наук"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Кафедра
              </label>
              <input
                type="text"
                name="supervisor.department"
                value={formData.supervisor?.department || ''}
                onChange={handleChange}
                placeholder="Кафедра изобразительного искусства"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* 8. Размеры (ВхШхГ) или диаметр */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            8. Размеры (ВхШхГ) или диаметр
          </label>
          <input
            type="text"
            name="dimensions"
            value={formData.dimensions || ''}
            onChange={handleChange}
            placeholder="Например: 30x20x15 см или диаметр 25 см"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* 9. Текущее местонахождение (экспозиция, запасник) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            9. Текущее местонахождение (экспозиция, запасник)
          </label>
          <input
            type="text"
            name="currentLocation"
            value={formData.currentLocation || ''}
            onChange={handleChange}
            placeholder="Например: Экспозиция зала №1 или Запасник"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* 10. Флаг, разрешающий показ на публичном сайте */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isPublic"
              checked={formData.isPublic ?? true}
              onChange={handleChange}
              className="w-5 h-5 text-primary-600 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              10. Разрешить показ на публичном сайте
            </span>
          </label>
        </div>

        {/* Дополнительные поля */}
        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Дополнительные поля</h3>
          
          {/* Категория (для обратной совместимости) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Категория <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="category"
              value={formData.category || ''}
              onChange={handleChange}
              placeholder="Например: Скульптура, Живопись, Графика"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {/* 3D модель */}
          <div className="mb-4">
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                name="has3DModel"
                checked={formData.has3DModel || false}
                onChange={handleChange}
                className="w-5 h-5 text-primary-600 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Есть 3D модель
              </span>
            </label>
            <input
              ref={modelFileRef}
              type="file"
              accept=".glb,.gltf"
              onChange={handleModelUpload}
              className="hidden"
            />
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => modelFileRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Загрузка...' : 'Выбрать 3D модель'}
              </button>
              {formData.modelPath && (
                <span className="text-sm text-gray-600">
                  Загружено: {formData.modelPath}
                </span>
              )}
            </div>
          </div>

          {/* Изображения */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Изображения
            </label>
            <input
              ref={imageFileRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="flex items-center gap-4 mb-4">
              <button
                type="button"
                onClick={() => imageFileRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Загрузка...' : 'Добавить изображение'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const file = imageFileRef.current?.files?.[0]
                  if (file) {
                    handleFileUpload(file, 'image').then((path) => {
                      if (path) {
                        setFormData((prev) => ({ ...prev, previewImage: path }))
                        setFormData((prev) => {
                          if (!prev.images?.includes(path)) {
                            return { ...prev, images: [...(prev.images || []), path] }
                          }
                          return prev
                        })
                      }
                    })
                  } else {
                    imageFileRef.current?.click()
                  }
                }}
                disabled={uploading}
                className="px-4 py-2 bg-primary-200 text-primary-700 rounded-lg hover:bg-primary-300 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Загрузка...' : 'Загрузить как превью'}
              </button>
            </div>
            
            {/* Превью изображение */}
            {formData.previewImage && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Превью изображение:</span>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, previewImage: '' }))}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Убрать превью
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-blue-600 break-all">{formData.previewImage}</span>
                  {formData.previewImage && (
                    <img 
                      src={formData.previewImage} 
                      alt="Preview" 
                      className="w-16 h-16 object-cover rounded border border-gray-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                </div>
              </div>
            )}
            
            {/* Список всех изображений */}
            {formData.images && formData.images.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700 block">Все изображения:</span>
                {formData.images.map((img, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center gap-2 p-2 rounded border ${
                      img === formData.previewImage 
                        ? 'bg-blue-50 border-blue-300' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`Image ${idx + 1}`}
                      className="w-12 h-12 object-cover rounded border border-gray-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                    <span className="flex-1 text-sm text-gray-600 break-all">{img}</span>
                    {img !== formData.previewImage && (
                      <button
                        type="button"
                        onClick={() => handleSetPreview(img)}
                        className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                      >
                        Сделать превью
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img)}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={uploading}
            className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {exhibit ? 'Сохранить изменения' : 'Создать экспонат'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  )
}
