import Link from 'next/link'
import { getGuideContent, getDefaultGuideContent } from '@/lib/guideContent'
import type { GuideContentData, GuideBlock } from '@/types/guide'

export const metadata = {
  title: 'Руководство пользователя | Виртуальная галерея ВГУ',
  description: 'Подробное руководство пользователя: работа с каталогом, виртуальной галереей, QR-кодами и админ-панелью.',
}

export const dynamic = 'force-dynamic'

function BlockRender({ block }: { block: GuideBlock }) {
  if (block.type === 'text') {
    return <p className="text-gray-700 leading-relaxed">{block.content}</p>
  }
  if (block.type === 'image') {
    if (block.src) {
      return (
        <figure className="my-6">
          <img
            src={block.src}
            alt={block.alt || ''}
            className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
          />
          {block.alt && (
            <figcaption className="mt-2 text-sm text-gray-500 text-center">
              {block.alt}
            </figcaption>
          )}
        </figure>
      )
    }
    return (
      <div className="my-6 p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center">
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">
          {block.alt || 'Здесь можно вставить изображение (добавьте его в редакторе руководства в админ-панели)'}
        </p>
      </div>
    )
  }
  if (block.type === 'faq') {
    return (
      <dl className="space-y-4">
        {block.items.map((item, i) => (
          <div key={i}>
            <dt className="font-semibold text-gray-800 mb-1">{item.q}</dt>
            <dd className="text-gray-700 pl-4 border-l-2 border-primary-200">{item.a}</dd>
          </div>
        ))}
      </dl>
    )
  }
  return null
}

export default async function UserGuidePage() {
  const raw = await getGuideContent()
  const data: GuideContentData = raw ?? getDefaultGuideContent()

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl font-bold mb-2 text-gray-800">Руководство пользователя</h1>
      {data.intro && (
        <p className="text-gray-600 mb-10">{data.intro}</p>
      )}

      <nav className="mb-12 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Содержание</h2>
        <ul className="space-y-2">
          {data.sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-primary-600 hover:text-primary-700 hover:underline"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-12">
        {data.sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-24"
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b border-gray-200 pb-2">
              {section.title}
            </h2>
            <div className="space-y-4">
              {section.blocks.map((block, i) => (
                <BlockRender key={i} block={block} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
        <Link href="/" className="text-primary-600 hover:underline">
          ← На главную
        </Link>
        <span className="mx-2">·</span>
        <Link href="/catalog" className="text-primary-600 hover:underline">
          Каталог
        </Link>
        <span className="mx-2">·</span>
        <Link href="/about" className="text-primary-600 hover:underline">
          О галерее
        </Link>
      </div>
    </div>
  )
}
