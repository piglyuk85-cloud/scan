'use client'

import Link from 'next/link'
import { Exhibit } from '@/types/exhibit'
import SafeImage from '@/components/SafeImage'
import ModelThumbnail from '@/components/ModelThumbnail'

interface ExhibitCardProps {
  exhibit: Exhibit
}

export default function ExhibitCard({ exhibit }: ExhibitCardProps) {
  const hasPreviewImage = exhibit.previewImage && exhibit.previewImage.trim() !== ''
  const shouldShow3DModel = !hasPreviewImage && exhibit.has3DModel && exhibit.modelPath

  return (
    <Link
      href={`/exhibit/${exhibit.id}`}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 group"
    >
      <div className="relative h-48 bg-gray-200 overflow-hidden">
        {hasPreviewImage ? (
          <SafeImage
            src={exhibit.previewImage!}
            alt={exhibit.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : shouldShow3DModel ? (
          <ModelThumbnail modelPath={exhibit.modelPath!} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
            <div className="text-center text-gray-400">
              <svg
                className="w-16 h-16 mx-auto mb-2"
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
              <p className="text-xs">Нет изображения</p>
            </div>
          </div>
        )}
        {exhibit.has3DModel && (
          <div className="absolute top-2 right-2 bg-primary-600 text-white px-2 py-1 rounded text-xs font-semibold">
            3D
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-primary-600 transition-colors">
          {exhibit.title}
        </h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {exhibit.description}
        </p>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span className="bg-gray-100 px-2 py-1 rounded">
            {exhibit.category}
          </span>
          <span>{exhibit.creationDate || exhibit.year || exhibit.studentName?.split(' ')[0] || ''}</span>
        </div>
      </div>
    </Link>
  )
}

