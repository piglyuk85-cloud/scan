import { getPageContent } from '@/lib/pageContent'

export default async function AboutPage() {
  const pageContent = await getPageContent()

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">О виртуальной галерее</h1>

      <div className="space-y-8 text-gray-700 leading-relaxed">
        {/* О проекте - показываем только если есть контент */}
        {(pageContent.about.project.title || pageContent.about.project.paragraphs.some(p => p.trim())) && (
          <section className="bg-white rounded-lg shadow-md p-8">
            {pageContent.about.project.title && (
              <h2 className="text-2xl font-bold mb-4 text-gray-800">{pageContent.about.project.title}</h2>
            )}
            {pageContent.about.project.paragraphs.filter(p => p.trim()).map((para, idx) => (
              <p key={idx} className={idx < pageContent.about.project.paragraphs.filter(p => p.trim()).length - 1 ? 'mb-4' : ''}>
                {para}
              </p>
            ))}
          </section>
        )}

        {/* ВГУ - показываем только если есть контент */}
        {(pageContent.about.university.title || pageContent.about.university.paragraphs.some(p => p.trim())) && (
          <section className="bg-white rounded-lg shadow-md p-8">
            {pageContent.about.university.title && (
              <h2 className="text-2xl font-bold mb-4 text-gray-800">{pageContent.about.university.title}</h2>
            )}
            {pageContent.about.university.paragraphs.filter(p => p.trim()).map((para, idx) => (
              <p key={idx} className={idx < pageContent.about.university.paragraphs.filter(p => p.trim()).length - 1 ? 'mb-4' : ''}>
                {para}
              </p>
            ))}
          </section>
        )}

        {/* Как это работает - показываем только если есть шаги */}
        {pageContent.about.howItWorks.steps && pageContent.about.howItWorks.steps.length > 0 && (
          <section className="bg-white rounded-lg shadow-md p-8">
            {pageContent.about.howItWorks.title && (
              <h2 className="text-2xl font-bold mb-4 text-gray-800">{pageContent.about.howItWorks.title}</h2>
            )}
            <div className="space-y-4">
              {pageContent.about.howItWorks.steps.map((step) => (
                <div key={step.number} className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Технологии - показываем только если есть контент */}
        {(pageContent.about.technologies.title || pageContent.about.technologies.description || (pageContent.about.technologies.items && pageContent.about.technologies.items.length > 0)) && (
          <section className="bg-white rounded-lg shadow-md p-8">
            {pageContent.about.technologies.title && (
              <h2 className="text-2xl font-bold mb-4 text-gray-800">{pageContent.about.technologies.title}</h2>
            )}
            {pageContent.about.technologies.description && (
              <p className="mb-4">
                {pageContent.about.technologies.description}
              </p>
            )}
            {pageContent.about.technologies.items && pageContent.about.technologies.items.length > 0 && (
              <ul className="list-disc list-inside space-y-2 ml-4">
                {pageContent.about.technologies.items.map((item, idx) => (
                  <li key={idx}>
                    <strong>{item.name}</strong> - {item.description}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Контакты - показываем только если есть контент */}
        {(pageContent.about.contacts.title || (pageContent.about.contacts.items && pageContent.about.contacts.items.length > 0)) && (
          <section className="bg-white rounded-lg shadow-md p-8">
            {pageContent.about.contacts.title && (
              <h2 className="text-2xl font-bold mb-4 text-gray-800">{pageContent.about.contacts.title}</h2>
            )}
            {pageContent.about.contacts.items && pageContent.about.contacts.items.length > 0 && (
              <div className="space-y-3">
                {pageContent.about.contacts.items.map((item, idx) => (
                  <p key={idx}>
                    <strong>{item.label}:</strong> {item.value}
                  </p>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

