'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Exhibit } from '@/types/exhibit'
import ExhibitCard from '@/components/ExhibitCard'
import { PageContent } from '@/types/pageContent'

const ITEMS_PER_PAGE = 6

export default function CatalogPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [show3DOnly, setShow3DOnly] = useState(false)
  const [exhibits, setExhibits] = useState<Exhibit[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const [years, setYears] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [pageContent, setPageContent] = useState<PageContent | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const isFirstLoad = useRef(true)

  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedCategory, setAppliedCategory] = useState<string>('all')
  const [appliedYear, setAppliedYear] = useState<string>('all')
  const [applied3D, setApplied3D] = useState(false)

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const fetchCatalog = useCallback(
    async (page: number, includeMeta: boolean) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('take', String(ITEMS_PER_PAGE))
        if (appliedSearch.trim()) params.set('search', appliedSearch.trim())
        if (appliedCategory !== 'all') params.set('category', appliedCategory)
        if (appliedYear !== 'all') params.set('year', appliedYear)
        if (applied3D) params.set('only3D', 'true')
        if (includeMeta) params.set('includeMeta', 'true')

        const res = await fetch(`/api/exhibits?${params.toString()}`)
        if (!res.ok) throw new Error('Ошибка загрузки экспонатов')
        const data = await res.json()
        setExhibits(data.exhibits ?? [])
        setTotalCount(data.totalCount ?? 0)
        if (data.categories) setCategories(data.categories)
        if (data.years) setYears(data.years)
      } catch (error) {
        console.error('Ошибка загрузки данных:', error)
        setExhibits([])
        setTotalCount(0)
      } finally {
        setLoading(false)
      }
    },
    [appliedSearch, appliedCategory, appliedYear, applied3D]
  )

  useEffect(() => {
    fetch('/api/page-content')
      .then((res) => res.ok ? res.json() : null)
      .then((content) => content && setPageContent(content))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchCatalog(currentPage, isFirstLoad.current)
    if (isFirstLoad.current) isFirstLoad.current = false
  }, [currentPage, appliedSearch, appliedCategory, appliedYear, applied3D, fetchCatalog])

  const handleApplyFilters = () => {
    setAppliedSearch(searchQuery)
    setAppliedCategory(selectedCategory)
    setAppliedYear(selectedYear)
    setApplied3D(show3DOnly)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => setCurrentPage(page)

  if (!pageContent && !loading) {
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
      <h1 className="text-4xl font-bold mb-8 text-gray-800">
        {pageContent?.settings.catalog.title ?? 'Каталог работ'}
      </h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="mb-6">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            {pageContent?.settings.catalog.searchLabel ?? 'Поиск'}
          </label>
          <input
            id="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
            placeholder={pageContent?.settings.catalog.searchPlaceholder ?? 'Введите название, описание или имя автора...'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              {pageContent?.settings.catalog.categoryLabel ?? 'Категория'}
            </label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">{pageContent?.settings.catalog.allCategories ?? 'Все категории'}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
              {pageContent?.settings.catalog.yearLabel ?? 'Год создания'}
            </label>
            <select
              id="year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">{pageContent?.settings.catalog.allYears ?? 'Все годы'}</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
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
                {pageContent?.settings.catalog.only3D ?? 'Только с 3D моделями'}
              </span>
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={handleApplyFilters}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          Применить
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка каталога...</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-between items-center">
            <p className="text-gray-600">
              {pageContent?.settings.catalog.foundWorks ?? 'Найдено работ'}: <span className="font-semibold">{totalCount}</span>
            </p>
            {totalPages > 1 && (
              <p className="text-gray-600 text-sm">
                Страница <span className="font-semibold">{currentPage}</span> из <span className="font-semibold">{totalPages}</span>
              </p>
            )}
          </div>

          {exhibits.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {exhibits.map((exhibit) => (
                  <ExhibitCard key={exhibit.id} exhibit={exhibit} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 border rounded-lg transition-colors ${
                            currentPage === page ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) return <span key={page} className="px-2 text-gray-400">...</span>
                    return null
                  })}
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
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
              <p className="text-gray-500 text-lg">{pageContent?.settings.catalog.noWorksFound ?? 'Работы не найдены'}</p>
              <p className="text-gray-400 mt-2">{pageContent?.settings.catalog.tryDifferentFilters ?? 'Попробуйте изменить параметры поиска или фильтры'}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
