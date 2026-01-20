'use client'

import { useState, useMemo, useEffect } from 'react'
import { type Exhibit } from '@/lib/exhibits'
import ExhibitCard from '@/components/ExhibitCard'
import { PageContent } from '@/types/pageContent'

export default function CatalogPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [show3DOnly, setShow3DOnly] = useState(false)
  const [allExhibits, setAllExhibits] = useState<Exhibit[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [years, setYears] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [pageContent, setPageContent] = useState<PageContent | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [exhibitsResponse, contentResponse] = await Promise.all([
          fetch('/api/exhibits'),
          fetch('/api/page-content'),
        ])
        
        if (!exhibitsResponse.ok) {
          throw new Error('Ошибка загрузки экспонатов')
        }
        
        const exhibits: Exhibit[] = await exhibitsResponse.json()
        const content: PageContent = await contentResponse.json()
        
        const cats = [...new Set(exhibits.map((e) => e.category))].sort()
        const yrs = [...new Set(exhibits.map((e) => e.year).filter(Boolean))].sort()
        
        setAllExhibits(exhibits)
        setCategories(cats)
        setYears(yrs)
        setPageContent(content)
      } catch (error) {
        console.error('Ошибка загрузки данных:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredExhibits = useMemo(() => {
    let filtered = allExhibits

    if (searchQuery) {
      filtered = filtered.filter(
        (exhibit) =>
          exhibit.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exhibit.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exhibit.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (exhibit.studentName &&
            exhibit.studentName.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((exhibit) => exhibit.category === selectedCategory)
    }

    if (selectedYear !== 'all') {
      filtered = filtered.filter((exhibit) => exhibit.year === selectedYear)
    }

    if (show3DOnly) {
      filtered = filtered.filter((exhibit) => exhibit.has3DModel)
    }

    return filtered
  }, [searchQuery, selectedCategory, selectedYear, show3DOnly, allExhibits])

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка каталога...</p>
        </div>
      </div>
    )
  }

  if (!pageContent) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">{pageContent.settings.catalog.title}</h1>

      {/* Поиск и фильтры */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        {/* Поиск */}
        <div className="mb-6">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            {pageContent.settings.catalog.searchLabel}
          </label>
          <input
            id="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={pageContent.settings.catalog.searchPlaceholder}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              {pageContent.settings.catalog.categoryLabel}
            </label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">{pageContent.settings.catalog.allCategories}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
              {pageContent.settings.catalog.yearLabel}
            </label>
            <select
              id="year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">{pageContent.settings.catalog.allYears}</option>
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
                {pageContent.settings.catalog.only3D}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Результаты */}
      <div className="mb-4">
        <p className="text-gray-600">
          {pageContent.settings.catalog.foundWorks}: <span className="font-semibold">{filteredExhibits.length}</span>
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
          <p className="text-gray-500 text-lg">{pageContent.settings.catalog.noWorksFound}</p>
          <p className="text-gray-400 mt-2">
            {pageContent.settings.catalog.tryDifferentFilters}
          </p>
        </div>
      )}
    </div>
  )
}
