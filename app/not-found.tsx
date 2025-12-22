import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-20 text-center">
      <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
      <h2 className="text-3xl font-semibold text-gray-600 mb-6">
        Страница не найдена
      </h2>
      <p className="text-gray-500 mb-8 text-lg">
        К сожалению, запрашиваемая страница не существует.
      </p>
      <Link
        href="/"
        className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
      >
        Вернуться на главную
      </Link>
    </div>
  )
}


