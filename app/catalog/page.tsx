'use client'

import { useState, useMemo } from 'react'
import { getExhibits, getCategories, getYears, searchExhibits } from '@/lib/exhibits'
import ExhibitCard from '@/components/ExhibitCard'

export default function CatalogPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [show3DOnly, setShow3DOnly] = useState(false)

  const allExhibits = getExhibits()
  const categories = getCategories()
  const years = getYears()

  const filteredExhibits = useMemo(() => {
    let filtered = allExhibits

    // Поиск
    if (searchQuery) {
      filtered = searchExhibits(searchQuery)
    }

    // Фильтр по категории
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((exhibit) => exhibit.category === selectedCategory)
    }

    // Фильтр по году
    if (selectedYear !== 'all') {
      filtered = filtered.filter((exhibit) => exhibit.year === selectedYear)
    }

    // Фильтр по наличию 3D модели
    if (show3DOnly) {
      filtered = filtered.filter((exhibit) => exhibit.has3DModel)
    }

    return filtered
  }, [searchQuery, selectedCategory, selectedYear, show3DOnly, allExhibits])

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">Каталог работ</h1>

      {/* Поиск и фильтры */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        {/* Поиск */}
        <div className="mb-6">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Поиск
          </label>
          <input
            id="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Введите название, описание или имя автора..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Категория
            </label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">Все категории</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
              Год создания
            </label>
            <select
              id="year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">Все годы</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={show3DOnly}
                onChange={(e) => setShow3DOnly(e.target.checked)}
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Только с 3D моделями
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Результаты */}
      <div className="mb-4">
        <p className="text-gray-600">
          Найдено работ: <span className="font-semibold">{filteredExhibits.length}</span>
        </p>
      </div>

      {filteredExhibits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExhibits.map((exhibit) => (
            <ExhibitCard key={exhibit.id} exhibit={exhibit} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500 text-lg">Работы не найдены</p>
          <p className="text-gray-400 mt-2">
            Попробуйте изменить параметры поиска или фильтры
          </p>
        </div>
      )}
    </div>
  )
}

