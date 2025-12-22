export interface Exhibit {
  id: string
  title: string
  description: string
  fullDescription?: string
  category: string
  year?: string // Год создания работы
  studentName?: string // Имя студента-автора
  studentCourse?: string // Курс студента
  studentGroup?: string // Группа студента
  supervisor?: string // Руководитель работы
  modelPath?: string
  has3DModel: boolean
  previewImage?: string
  images?: string[]
  creationInfo?: string // Информация о создании работы
  technicalSpecs?: {
    [key: string]: string
  }
  interestingFacts?: string[]
  relatedExhibits?: string[]
}

