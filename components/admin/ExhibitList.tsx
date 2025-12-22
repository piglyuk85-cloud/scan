'use client'

import { Exhibit } from '@/types/exhibit'
import Link from 'next/link'

interface ExhibitListProps {
  exhibits: Exhibit[]
  onEdit: (exhibit: Exhibit) => void
  onDelete: (id: string) => void
  onRefresh: () => void
}

export default function ExhibitList({
  exhibits,
  onEdit,
  onDelete,
  onRefresh,
}: ExhibitListProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Работы ({exhibits.length})
        </h2>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Обновить
        </button>
      </div>

      {exhibits.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <p className="text-lg mb-2">Работы не найдены</p>
          <p className="text-sm">Добавьте первую работу, используя кнопку выше</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Категория
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Автор
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  3D
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {exhibits.map((exhibit) => (
                <tr key={exhibit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {exhibit.title}
                    </div>
                    <div className="text-sm text-gray-500 line-clamp-1">
                      {exhibit.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                      {exhibit.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {exhibit.studentName || exhibit.year || '-'}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <Link
                        href={`/exhibit/${exhibit.id}`}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Просмотр
                      </Link>
                      <button
                        onClick={() => onEdit(exhibit)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => onDelete(exhibit.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Удалить
                      </button>
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

