import { notFound } from 'next/navigation'
import { getExhibitById, getExhibits } from '@/lib/exhibits'
import { getPageContent } from '@/lib/pageContent'
import { cookies } from 'next/headers'
import Link from 'next/link'
import ModelViewer from '@/components/ModelViewer'
import QRCodeDisplay from '@/components/QRCodeDisplay'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: {
    id: string
  }
}

export default async function ExhibitPage({ params }: PageProps) {
  let isAdmin = false
  let adminRole = 'admin'
  
  try {
    const cookieStore = await cookies()
    isAdmin = cookieStore.get('admin_auth')?.value === 'true'
    adminRole = cookieStore.get('admin_role')?.value || 'admin'
  } catch (error) {
    // Если cookies недоступны (например, при статической генерации), используем значения по умолчанию
    console.warn('Не удалось получить cookies:', error)
  }
  
  const exhibit = await getExhibitById(params.id, isAdmin)

  if (!exhibit) {
    notFound()
  }

  if (!exhibit.isPublic && !isAdmin) {
    notFound()
  }

  const allExhibits = await getExhibits(false)
  const currentIndex = allExhibits.findIndex((e) => e.id === exhibit.id)
  const prevExhibit = currentIndex > 0 ? allExhibits[currentIndex - 1] : null
  const nextExhibit =
    currentIndex < allExhibits.length - 1 ? allExhibits[currentIndex + 1] : null

  const pageContent = await getPageContent()

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Навигация назад и админ-панель */}
      <div className="flex justify-between items-center mb-6">
        <Link
          href="/catalog"
          className="inline-flex items-center text-primary-600 hover:text-primary-700"
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
          {pageContent.settings.exhibit.backToCatalog}
        </Link>
        {isAdmin && (
          <Link
            href={`/admin?edit=${exhibit.id}`}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            {pageContent.settings.exhibit.editButton}
          </Link>
        )}
      </div>

      {/* Заголовок */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-semibold">
            {exhibit.category}
          </span>
          {(exhibit.creationDate || exhibit.year) && (
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
              {exhibit.creationDate || exhibit.year}
            </span>
          )}
          {!exhibit.isPublic && isAdmin && (
            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-semibold">
              Приватный
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
              <h2 className="text-2xl font-bold mb-4 text-gray-800">{pageContent.settings.exhibit.model3D}</h2>
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <ModelViewer modelPath={exhibit.modelPath} />
              </div>
            </div>
          )}

          {/* Описание */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">{pageContent.settings.exhibit.description}</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {exhibit.fullDescription || exhibit.description}
            </p>
          </div>

          {/* Информация об авторе */}
          {(exhibit.studentName || exhibit.studentCourse || exhibit.studentGroup || 
            exhibit.supervisor) && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">
                {pageContent.settings.exhibit.aboutAuthor}
              </h2>
              <dl className="space-y-3">
                {exhibit.studentName && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{pageContent.settings.exhibit.author}</dt>
                    <dd className="text-lg text-gray-800 mt-1">{exhibit.studentName}</dd>
                  </div>
                )}
                {exhibit.studentCourse && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{pageContent.settings.exhibit.course}</dt>
                    <dd className="text-lg text-gray-800 mt-1">{exhibit.studentCourse}</dd>
                  </div>
                )}
                {exhibit.studentGroup && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{pageContent.settings.exhibit.group}</dt>
                    <dd className="text-lg text-gray-800 mt-1">{exhibit.studentGroup}</dd>
                  </div>
                )}
                {exhibit.supervisor && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{pageContent.settings.exhibit.supervisor}</dt>
                    <dd className="text-lg text-gray-800 mt-1">
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
          {(exhibit.creationDate || exhibit.dimensions || exhibit.currentLocation || exhibit.inventoryNumber) && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">
                {pageContent.settings.exhibit.additionalInfo}
              </h2>
              <dl className="space-y-3">
                {exhibit.creationDate && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{pageContent.settings.exhibit.creationDate}</dt>
                    <dd className="text-lg text-gray-800 mt-1">{exhibit.creationDate}</dd>
                  </div>
                )}
                {exhibit.dimensions && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{pageContent.settings.exhibit.dimensions}</dt>
                    <dd className="text-lg text-gray-800 mt-1">{exhibit.dimensions}</dd>
                  </div>
                )}
                {exhibit.currentLocation && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{pageContent.settings.exhibit.location}</dt>
                    <dd className="text-lg text-gray-800 mt-1">{exhibit.currentLocation}</dd>
                  </div>
                )}
                {/* Инвентарный номер - только для администраторов */}
                {exhibit.inventoryNumber && isAdmin && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{pageContent.settings.exhibit.inventoryNumber}</dt>
                    <dd className="text-lg text-gray-800 mt-1">{exhibit.inventoryNumber}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Информация о создании (старое поле для совместимости) */}
          {exhibit.creationInfo && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">
                {pageContent.settings.exhibit.creationInfo}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {exhibit.creationInfo}
              </p>
            </div>
          )}

          {/* Интересные факты */}
          {exhibit.interestingFacts && exhibit.interestingFacts.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">
                {pageContent.settings.exhibit.interestingFacts}
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
            <h3 className="text-xl font-bold mb-4 text-gray-800">{pageContent.settings.exhibit.qrCode}</h3>
            <QRCodeDisplay exhibitId={exhibit.id} />
            <p className="text-sm text-gray-500 mt-4 text-center">
              {pageContent.settings.exhibit.qrCodeDescription}
            </p>
          </div>

          {/* Навигация между экспонатами */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">{pageContent.settings.exhibit.navigation}</h3>
            <div className="space-y-4">
              {prevExhibit && (
                <Link
                  href={`/exhibit/${prevExhibit.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <div className="text-sm text-gray-500 mb-1">{pageContent.settings.exhibit.previous}</div>
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
                  <div className="text-sm text-gray-500 mb-1">{pageContent.settings.exhibit.next}</div>
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

