import Link from 'next/link'
import { getExhibits } from '@/lib/exhibits'
import { getPageContent } from '@/lib/pageContent'
import ExhibitCard from '@/components/ExhibitCard'

export default async function Home() {
  const exhibits = await getExhibits(false)
  const featuredExhibits = exhibits.slice(0, 6)
  const pageContent = await getPageContent()

  return (
    <div className="flex flex-col">
      <section className="relative bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              {pageContent.home.hero.title}
            </h1>
            <p className="text-xl md:text-2xl mb-4 text-primary-100">
              {pageContent.home.hero.subtitle}
            </p>
            <p className="text-lg md:text-xl mb-8 text-primary-200">
              {pageContent.home.hero.description}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/catalog"
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
              >
                {pageContent.home.buttons.catalog}
              </Link>
              <Link
                href="/gallery"
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
              >
                {pageContent.home.buttons.virtualGallery}
              </Link>
              <Link
                href="/about"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors"
              >
                {pageContent.home.buttons.about}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">
              {pageContent.home.sections.popularWorks}
            </h2>
            <Link
              href="/catalog"
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              {pageContent.home.buttons.viewAll}
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredExhibits.map((exhibit) => (
              <ExhibitCard key={exhibit.id} exhibit={exhibit} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4 text-gray-800">
                {pageContent.home.aboutSection.title}
              </h2>
              <p className="text-gray-600 mb-4 text-lg">
                {pageContent.home.aboutSection.description1}
              </p>
              <p className="text-gray-600 mb-6 text-lg">
                {pageContent.home.aboutSection.description2}
              </p>
              <div className="flex gap-4">
                <Link
                  href="/gallery"
                  className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                >
                  {pageContent.home.buttons.virtualGallery}
                </Link>
                <Link
                  href="/about"
                  className="inline-block border-2 border-primary-600 text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
                >
                  {pageContent.home.buttons.learnMore}
                </Link>
              </div>
            </div>
            <div className="bg-primary-100 rounded-lg p-8 text-center">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-4xl font-bold text-primary-600 mb-2">
                    {exhibits.length}+
                  </div>
                  <div className="text-gray-600">{pageContent.home.stats.works}</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary-600 mb-2">
                    3D
                  </div>
                  <div className="text-gray-600">{pageContent.home.stats.models}</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary-600 mb-2">
                    QR
                  </div>
                  <div className="text-gray-600">{pageContent.home.stats.qrCodes}</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary-600 mb-2">
                    24/7
                  </div>
                  <div className="text-gray-600">{pageContent.home.stats.access}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

