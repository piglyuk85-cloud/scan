import { notFound } from 'next/navigation'
import { getExhibitById, getExhibits } from '@/lib/exhibits'
import Link from 'next/link'
import ModelViewer from '@/components/ModelViewer'
import QRCodeDisplay from '@/components/QRCodeDisplay'

interface PageProps {
  params: {
    id: string
  }
}

export async function generateStaticParams() {
  const exhibits = getExhibits()
  return exhibits.map((exhibit) => ({
    id: exhibit.id,
  }))
}

export default function ExhibitPage({ params }: PageProps) {
  const exhibit = getExhibitById(params.id)

  if (!exhibit) {
    notFound()
  }

  const allExhibits = getExhibits()
  const currentIndex = allExhibits.findIndex((e) => e.id === exhibit.id)
  const prevExhibit = currentIndex > 0 ? allExhibits[currentIndex - 1] : null
  const nextExhibit =
    currentIndex < allExhibits.length - 1 ? allExhibits[currentIndex + 1] : null

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Навигация назад */}
      <Link
        href="/catalog"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Вернуться в каталог
      </Link>

      {/* Заголовок */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-semibold">
            {exhibit.category}
          </span>
          {exhibit.year && (
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
              {exhibit.year}
            </span>
          )}
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          {exhibit.title}
        </h1>
        <p className="text-xl text-gray-600">{exhibit.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Основной контент */}
        <div className="lg:col-span-2 space-y-8">
          {/* 3D Модель */}
          {exhibit.has3DModel && exhibit.modelPath && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">3D Модель</h2>
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <ModelViewer modelPath={exhibit.modelPath} />
              </div>
            </div>
          )}

          {/* Описание */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Описание</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {exhibit.fullDescription || exhibit.description}
            </p>
          </div>

          {/* Информация об авторе */}
          {(exhibit.studentName || exhibit.studentCourse || exhibit.supervisor) && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">
                Об авторе
              </h2>
              <dl className="space-y-3">
                {exhibit.studentName && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Автор</dt>
                    <dd className="text-lg text-gray-800 mt-1">{exhibit.studentName}</dd>
                  </div>
                )}
                {exhibit.studentCourse && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Курс</dt>
                    <dd className="text-lg text-gray-800 mt-1">{exhibit.studentCourse}</dd>
                  </div>
                )}
                {exhibit.studentGroup && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Группа</dt>
                    <dd className="text-lg text-gray-800 mt-1">{exhibit.studentGroup}</dd>
                  </div>
                )}
                {exhibit.supervisor && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Руководитель</dt>
                    <dd className="text-lg text-gray-800 mt-1">{exhibit.supervisor}</dd>
                  </div>
                )}
                {exhibit.year && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Год создания</dt>
                    <dd className="text-lg text-gray-800 mt-1">{exhibit.year}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Информация о создании */}
          {exhibit.creationInfo && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">
                О работе
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {exhibit.creationInfo}
              </p>
            </div>
          )}

          {/* Технические характеристики */}
          {exhibit.technicalSpecs && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">
                Технические характеристики
              </h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(exhibit.technicalSpecs).map(([key, value]) => (
                  <div key={key} className="border-b border-gray-200 pb-2">
                    <dt className="text-sm font-medium text-gray-500">{key}</dt>
                    <dd className="text-lg text-gray-800 mt-1">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Интересные факты */}
          {exhibit.interestingFacts && exhibit.interestingFacts.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">
                Интересные факты
              </h2>
              <ul className="space-y-3">
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

        {/* Боковая панель */}
        <div className="space-y-6">
          {/* QR код */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">QR-код</h3>
            <QRCodeDisplay exhibitId={exhibit.id} />
            <p className="text-sm text-gray-500 mt-4 text-center">
              Отсканируйте для быстрого доступа
            </p>
          </div>

          {/* Навигация между экспонатами */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Навигация</h3>
            <div className="space-y-4">
              {prevExhibit && (
                <Link
                  href={`/exhibit/${prevExhibit.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <div className="text-sm text-gray-500 mb-1">Предыдущий</div>
                  <div className="font-semibold text-gray-800">
                    {prevExhibit.title}
                  </div>
                </Link>
              )}
              {nextExhibit && (
                <Link
                  href={`/exhibit/${nextExhibit.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <div className="text-sm text-gray-500 mb-1">Следующий</div>
                  <div className="font-semibold text-gray-800">
                    {nextExhibit.title}
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

