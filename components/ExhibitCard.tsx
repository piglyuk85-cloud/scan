import Link from 'next/link'
import { Exhibit } from '@/types/exhibit'
import SafeImage from '@/components/SafeImage'

interface ExhibitCardProps {
  exhibit: Exhibit
}

export default function ExhibitCard({ exhibit }: ExhibitCardProps) {
  return (
    <Link
      href={`/exhibit/${exhibit.id}`}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 group"
    >
      <div className="relative h-48 bg-gray-200 overflow-hidden">
        <SafeImage
          src={exhibit.previewImage}
          alt={exhibit.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
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
          <span>{exhibit.year || exhibit.studentName?.split(' ')[0] || ''}</span>
        </div>
      </div>
    </Link>
  )
}

