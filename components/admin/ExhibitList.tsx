'use client'

import { useState, useMemo } from 'react'
import { Exhibit } from '@/types/exhibit'
import Link from 'next/link'
import ModelThumbnail from '@/components/ModelThumbnail'
import SafeImage from '@/components/SafeImage'

interface ExhibitListProps {
  exhibits: Exhibit[]
  onEdit: (exhibit: Exhibit) => void
  onDelete: (id: string) => void
  onRefresh: () => void
  userRole?: 'admin' | 'super' | null
}

type SortField = 'title' | 'category' | 'studentName' | 'creationDate' | 'createdAt'
type SortDirection = 'asc' | 'desc'

export default function ExhibitList({
  exhibits,
  onEdit,
  onDelete,
  onRefresh,
  userRole,
}: ExhibitListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showPrivateOnly, setShowPrivateOnly] = useState(false)

  // Фильтрация и сортировка
  const filteredAndSortedExhibits = useMemo(() => {
    let filtered = exhibits

    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (exhibit) =>
          exhibit.title.toLowerCase().includes(query) ||
          exhibit.description.toLowerCase().includes(query) ||
          exhibit.category.toLowerCase().includes(query) ||
          (exhibit.studentName && exhibit.studentName.toLowerCase().includes(query)) ||
          (exhibit.creationDate && exhibit.creationDate.toLowerCase().includes(query)) ||
          (exhibit.inventoryNumber && exhibit.inventoryNumber.toLowerCase().includes(query))
      )
    }

    if (showPrivateOnly) {
      filtered = filtered.filter((exhibit) => !exhibit.isPublic)
    }

    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'category':
          aValue = a.category.toLowerCase()
          bValue = b.category.toLowerCase()
          break
        case 'studentName':
          aValue = (a.studentName || '').toLowerCase()
          bValue = (b.studentName || '').toLowerCase()
          break
        case 'creationDate':
          aValue = a.creationDate || a.year || ''
          bValue = b.creationDate || b.year || ''
          break
        case 'createdAt':
        default:
          aValue = a.id
          bValue = b.id
          break
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [exhibits, searchQuery, sortField, sortDirection, showPrivateOnly])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return (
      <span className="ml-1 text-primary-600">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Панель поиска и фильтров */}
      <div className="p-6 border-b border-gray-200 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            Работы ({filteredAndSortedExhibits.length} из {exhibits.length})
          </h2>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Обновить
          </button>
        </div>

        {/* Поиск */}
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию, описанию, категории, автору..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Фильтр приватных */}
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={showPrivateOnly}
              onChange={(e) => setShowPrivateOnly(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Только приватные</span>
          </label>
        </div>
      </div>

      {exhibits.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <p className="text-lg mb-2">Работы не найдены</p>
          <p className="text-sm">Добавьте первую работу, используя кнопку выше</p>
        </div>
      ) : filteredAndSortedExhibits.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <p className="text-lg mb-2">По запросу ничего не найдено</p>
          <p className="text-sm">Попробуйте изменить параметры поиска</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center">
                    Название
                    <SortIcon field="title" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center">
                    Категория
                    <SortIcon field="category" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('studentName')}
                >
                  <div className="flex items-center">
                    Автор
                    <SortIcon field="studentName" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('creationDate')}
                >
                  <div className="flex items-center">
                    Дата
                    <SortIcon field="creationDate" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  3D
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedExhibits.map((exhibit) => (
                <tr
                  key={exhibit.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {/* Миниатюра 3D модели или изображения */}
                      <div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-gray-100 border border-gray-200">
                        {exhibit.previewImage && exhibit.previewImage.trim() ? (
                          <SafeImage
                            src={exhibit.previewImage}
                            alt={exhibit.title}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : exhibit.has3DModel && exhibit.modelPath ? (
                          <ModelThumbnail modelPath={exhibit.modelPath} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                            <svg
                              className="w-6 h-6 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {exhibit.title}
                        </div>
                        <div className="text-sm text-gray-500 line-clamp-1 mt-1">
                          {exhibit.description || exhibit.previewText || '-'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                      {exhibit.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {exhibit.studentName || exhibit.creationDate || exhibit.year || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {exhibit.creationDate || exhibit.year || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {exhibit.has3DModel ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                        Да
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                        Нет
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {exhibit.isPublic === false ? (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
                        Приватный
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                        Публичный
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <Link
                        href={`/exhibit/${exhibit.id}`}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-900 hover:underline"
                        title="Открыть в новой вкладке"
                      >
                        Просмотр
                      </Link>
                      <button
                        onClick={() => onEdit(exhibit)}
                        className="text-primary-600 hover:text-primary-900 hover:underline"
                        title="Редактировать экспонат"
                      >
                        Редактировать
                      </button>
                      {(userRole === 'super' || userRole === 'admin') && (
                        <button
                          onClick={() => onDelete(exhibit.id)}
                          className="text-red-600 hover:text-red-900 hover:underline"
                          title="Удалить экспонат"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

