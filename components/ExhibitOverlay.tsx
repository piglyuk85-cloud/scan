'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Exhibit } from '@/types/exhibit'
import Link from 'next/link'

interface ExhibitOverlayProps {
  exhibit: Exhibit | null
  onClose: () => void
}

export default function ExhibitOverlay({ exhibit, onClose }: ExhibitOverlayProps) {
  if (!exhibit) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 1 }}
        transition={{ duration: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop с размытием */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          transition={{ duration: 0 }}
          className="absolute inset-0 bg-black/40"
          style={{
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        />

        {/* Панель с информацией */}
        <motion.div
          initial={{ x: 0, opacity: 1 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 0, opacity: 1 }}
          transition={{ duration: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Заголовок с кнопкой закрытия */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-white">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-semibold">
                  {exhibit.category}
                </span>
                {(exhibit.creationDate || exhibit.year) && (
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    {exhibit.creationDate || exhibit.year}
                  </span>
                )}
              </div>
              <h2 className="text-3xl font-bold text-gray-800">{exhibit.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Закрыть"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Контент с прокруткой */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Описание */}
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Описание</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {exhibit.fullDescription || exhibit.description}
              </p>
            </div>

            {/* Информация об авторе */}
            {(exhibit.studentName || exhibit.studentCourse || exhibit.studentGroup || exhibit.supervisor) && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Об авторе</h3>
                <dl className="space-y-2">
                  {exhibit.studentName && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Автор</dt>
                      <dd className="text-lg text-gray-800">{exhibit.studentName}</dd>
                    </div>
                  )}
                  {exhibit.studentCourse && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Курс</dt>
                      <dd className="text-lg text-gray-800">{exhibit.studentCourse}</dd>
                    </div>
                  )}
                  {exhibit.studentGroup && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Группа</dt>
                      <dd className="text-lg text-gray-800">{exhibit.studentGroup}</dd>
                    </div>
                  )}
                  {exhibit.supervisor && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Научный руководитель</dt>
                      <dd className="text-lg text-gray-800">
                        {exhibit.supervisor.name}
                        {exhibit.supervisor.position && `, ${exhibit.supervisor.position}`}
                        {exhibit.supervisor.rank && `, ${exhibit.supervisor.rank}`}
                        {exhibit.supervisor.department && `, ${exhibit.supervisor.department}`}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Дополнительная информация */}
            {(exhibit.dimensions || exhibit.currentLocation) && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Дополнительная информация</h3>
                <dl className="space-y-2">
                  {exhibit.dimensions && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Размеры</dt>
                      <dd className="text-lg text-gray-800">{exhibit.dimensions}</dd>
                    </div>
                  )}
                  {exhibit.currentLocation && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Местонахождение</dt>
                      <dd className="text-lg text-gray-800">{exhibit.currentLocation}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Интересные факты */}
            {exhibit.interestingFacts && exhibit.interestingFacts.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Интересные факты</h3>
                <ul className="space-y-2">
                  {exhibit.interestingFacts.map((fact, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-primary-600 mr-3 mt-1">•</span>
                      <span className="text-gray-700">{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Футер с кнопкой "Подробнее" */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <Link
              href={`/exhibit/${exhibit.id}`}
              className="block w-full text-center bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
              onClick={onClose}
            >
              Подробнее на странице экспоната
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
