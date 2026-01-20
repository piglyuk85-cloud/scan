'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Exhibit } from '@/types/exhibit'
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
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 6

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
        
        const cats = Array.from(new Set(exhibits.map((e) => e.category))).sort()
        const yrs = Array.from(
          new Set(exhibits.map((e) => e.year).filter(Boolean) as string[])
        ).sort()
        
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

  const totalPages = Math.ceil(filteredExhibits.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedExhibits = filteredExhibits.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory, selectedYear, show3DOnly])

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
      <div className="mb-4 flex justify-between items-center">
        <p className="text-gray-600">
          {pageContent.settings.catalog.foundWorks}: <span className="font-semibold">{filteredExhibits.length}</span>
        </p>
        {totalPages > 1 && (
          <p className="text-gray-600 text-sm">
            Страница <span className="font-semibold">{currentPage}</span> из <span className="font-semibold">{totalPages}</span>
          </p>
        )}
      </div>

      {filteredExhibits.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {paginatedExhibits.map((exhibit) => (
              <ExhibitCard key={exhibit.id} exhibit={exhibit} />
            ))}
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 border rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-2 text-gray-400">...</span>
                }
                return null
              })}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </>
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
