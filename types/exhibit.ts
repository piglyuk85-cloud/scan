export interface Exhibit {
  id: string
  // 1. Учетный инвентарный номер фонда/музея
  inventoryNumber?: string
  // 2. Краткое название экспоната
  title: string
  // 3. Текст для превью/карточки (2-3 предложения)
  description: string
  // 4. Полное описание: история создания, стилистика, символика
  fullDescription?: string
  // 5. Дата создания
  creationDate?: string
  // 6. Автор/мастер (ФИО, курс, группа)
  studentName?: string
  studentCourse?: string
  studentGroup?: string
  // 7. Научный руководитель (ФИО, должность, звание, кафедра)
  supervisor?: string
  supervisorPosition?: string
  supervisorRank?: string
  supervisorDepartment?: string
  // 8. Размеры (ВхШхГ) или диаметр
  dimensions?: string
  // 9. Текущее местонахождение (экспозиция, запасник)
  currentLocation?: string
  // 10. Флаг, разрешающий показ на публичном сайте
  isPublic?: boolean
  
  // Дополнительные поля для совместимости
  category: string
  year?: string // Оставляем для обратной совместимости
  modelPath?: string
  has3DModel: boolean
  previewImage?: string
  images?: string[]
  creationInfo?: string
  technicalSpecs?: {
    [key: string]: string
  }
  interestingFacts?: string[]
  relatedExhibits?: string[]
  // Позиция в виртуальном пространстве
  galleryPositionX?: number
  galleryPositionY?: number
  galleryPositionZ?: number
  // Размер экспоната в галерее
  galleryScale?: number
  // Поворот экспоната в галерее
  galleryRotationY?: number
  // Видимость в галерее
  visibleInGallery?: boolean
}

