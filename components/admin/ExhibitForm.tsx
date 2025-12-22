'use client'

import { useState, useEffect, useRef } from 'react'
import { Exhibit } from '@/types/exhibit'

interface ExhibitFormProps {
  exhibit?: Exhibit | null
  onSubmit: () => void
  onCancel: () => void
}

export default function ExhibitForm({ exhibit, onSubmit, onCancel }: ExhibitFormProps) {
  const [formData, setFormData] = useState<Partial<Exhibit>>({
    title: '',
    description: '',
    fullDescription: '',
    category: '',
    year: '',
    studentName: '',
    studentCourse: '',
    studentGroup: '',
    supervisor: '',
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

  useEffect(() => {
    if (exhibit) {
      setFormData(exhibit)
    }
  }, [exhibit])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleTechnicalSpecsChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      technicalSpecs: {
        ...prev.technicalSpecs,
        [key]: value,
      },
    }))
  }

  const handleAddTechnicalSpec = () => {
    const key = prompt('Введите название характеристики:')
    if (key) {
      handleTechnicalSpecsChange(key, '')
    }
  }

  const handleRemoveTechnicalSpec = (key: string) => {
    const specs = { ...formData.technicalSpecs }
    delete specs[key]
    setFormData((prev) => ({ ...prev, technicalSpecs: specs }))
  }

  const handleAddInterestingFact = () => {
    const fact = prompt('Введите интересный факт:')
    if (fact) {
      setFormData((prev) => ({
        ...prev,
        interestingFacts: [...(prev.interestingFacts || []), fact],
      }))
    }
  }

  const handleRemoveInterestingFact = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      interestingFacts: prev.interestingFacts?.filter((_, i) => i !== index) || [],
    }))
  }

  const handleFileUpload = async (
    file: File,
    type: 'model' | 'image'
  ): Promise<string | null> => {
    setUploading(true)
    setUploadProgress(`Загрузка ${file.name}...`)

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
      setUploadProgress('Файл загружен успешно!')
      return data.path
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      alert('Ошибка при загрузке файла')
      return null
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(''), 2000)
    }
  }

  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.glb') && !file.name.endsWith('.gltf')) {
      alert('Поддерживаются только файлы .glb и .gltf')
      return
    }

    const path = await handleFileUpload(file, 'model')
    if (path) {
      setFormData((prev) => ({
        ...prev,
        modelPath: path,
        has3DModel: true,
      }))
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const path = await handleFileUpload(file, 'image')
    if (path) {
      // Если превью еще нет, устанавливаем первое изображение как превью
      if (!formData.previewImage) {
        setFormData((prev) => ({ ...prev, previewImage: path }))
      }
      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), path],
      }))
    }
    // Сбрасываем значение input, чтобы можно было загрузить тот же файл снова
    if (imageFileRef.current) {
      imageFileRef.current.value = ''
    }
  }

  const handleSetPreview = (imagePath: string) => {
    setFormData((prev) => ({ ...prev, previewImage: imagePath }))
  }

  const handleRemoveImage = (imagePath: string) => {
    setFormData((prev) => {
      const newImages = (prev.images || []).filter((img) => img !== imagePath)
      // Если удаляем превью, устанавливаем первое оставшееся изображение как превью
      let newPreview = prev.previewImage
      if (prev.previewImage === imagePath) {
        newPreview = newImages.length > 0 ? newImages[0] : ''
      }
      return {
        ...prev,
        images: newImages,
        previewImage: newPreview,
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.description || !formData.category) {
      alert('Заполните все обязательные поля')
      return
    }

    try {
      const url = exhibit
        ? `/api/exhibits/${exhibit.id}`
        : '/api/exhibits'
      const method = exhibit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert(exhibit ? 'Работа обновлена' : 'Работа создана')
        onSubmit()
      } else {
        const error = await response.json()
        alert(error.error || 'Ошибка при сохранении')
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      alert('Ошибка при сохранении работы')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {exhibit ? 'Редактировать работу' : 'Добавить новую работу'}
      </h2>

      {uploadProgress && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-lg">
          {uploadProgress}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Основная информация */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Категория <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Год создания
            </label>
            <input
              type="text"
              name="year"
              value={formData.year}
              onChange={handleChange}
              placeholder="2024"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="flex items-center mt-6">
              <input
                type="checkbox"
                name="has3DModel"
                checked={formData.has3DModel}
                onChange={handleChange}
                className="w-5 h-5 text-primary-600 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Есть 3D модель
              </span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Краткое описание <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Полное описание
          </label>
          <textarea
            name="fullDescription"
            value={formData.fullDescription}
            onChange={handleChange}
            rows={5}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Загрузка 3D модели */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            3D Модель (.glb)
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
              {uploading ? 'Загрузка...' : 'Выбрать файл'}
            </button>
            {formData.modelPath && (
              <span className="text-sm text-gray-600">
                Загружено: {formData.modelPath}
              </span>
            )}
          </div>
        </div>

        {/* Загрузка изображений */}
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
                      // Добавляем в список изображений, если его там еще нет
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

        {/* Информация об авторе */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Информация об авторе</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Имя студента
              </label>
              <input
                type="text"
                name="studentName"
                value={formData.studentName}
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
                value={formData.studentCourse}
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
                value={formData.studentGroup}
                onChange={handleChange}
                placeholder="ХД-31"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Руководитель
              </label>
              <input
                type="text"
                name="supervisor"
                value={formData.supervisor}
                onChange={handleChange}
                placeholder="ФИО руководителя"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Информация о создании работы */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            О работе
          </label>
          <textarea
            name="creationInfo"
            value={formData.creationInfo}
            onChange={handleChange}
            rows={4}
            placeholder="Описание процесса создания, концепции работы, техники исполнения..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Технические характеристики */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Технические характеристики
            </label>
            <button
              type="button"
              onClick={handleAddTechnicalSpec}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              + Добавить
            </button>
          </div>
          <div className="space-y-2">
            {formData.technicalSpecs &&
              Object.entries(formData.technicalSpecs).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <input
                    type="text"
                    value={key}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleTechnicalSpecsChange(key, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTechnicalSpec(key)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                  >
                    Удалить
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Интересные факты */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Интересные факты
            </label>
            <button
              type="button"
              onClick={handleAddInterestingFact}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              + Добавить
            </button>
          </div>
          <div className="space-y-2">
            {formData.interestingFacts?.map((fact, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={fact}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveInterestingFact(index)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={uploading}
            className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {exhibit ? 'Сохранить изменения' : 'Создать работу'}
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

