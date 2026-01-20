'use client'

import { useState, useEffect } from 'react'
import { PageContent } from '@/types/pageContent'

interface PageContentEditorProps {
  onSave: () => void
}

export default function PageContentEditor({ onSave }: PageContentEditorProps) {
  const [content, setContent] = useState<PageContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'about' | 'settings'>('home')

  useEffect(() => {
    loadContent()
  }, [])

  const loadContent = async () => {
    try {
      const response = await fetch('/api/page-content')
      if (response.ok) {
        const data = await response.json()
        setContent(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки контента:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!content) return

    setSaving(true)
    try {
      const response = await fetch('/api/page-content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(content),
      })

      if (response.ok) {
        const result = await response.json()
        alert('Контент сохранен успешно!')
        onSave()
      } else {
        const error = await response.json()
        console.error('Ошибка API:', error)
        alert(error.error || 'Ошибка при сохранении контента')
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      alert('Ошибка при сохранении контента. Проверьте консоль для деталей.')
    } finally {
      setSaving(false)
    }
  }

  const updateContent = (path: string[], value: any) => {
    if (!content) return

    const newContent = { ...content }
    let current: any = newContent

    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {}
      }
      current = current[path[i]]
    }

    current[path[path.length - 1]] = value
    setContent(newContent)
  }

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>
  }

  if (!content) {
    return <div className="text-center py-8">Ошибка загрузки контента</div>
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Редактирование контента страниц</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : 'Сохранить все изменения'}
        </button>
      </div>

      {/* Вкладки */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('home')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'home'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Главная страница
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'about'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          О галерее
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'settings'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Настройки сайта
        </button>
      </div>

      {/* Контент вкладок */}
      <div className="space-y-6">
        {activeTab === 'home' && (
          <HomePageEditor content={content.home} updateContent={updateContent} />
        )}
        {activeTab === 'about' && (
          <AboutPageEditor content={content.about} updateContent={updateContent} />
        )}
        {activeTab === 'settings' && (
          <SettingsEditor content={content.settings} updateContent={updateContent} />
        )}
      </div>
    </div>
  )
}

function HomePageEditor({
  content,
  updateContent,
}: {
  content: PageContent['home']
  updateContent: (path: string[], value: any) => void
}) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Hero секция</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Заголовок
            </label>
            <input
              type="text"
              value={content.hero.title}
              onChange={(e) => updateContent(['home', 'hero', 'title'], e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Подзаголовок
            </label>
            <input
              type="text"
              value={content.hero.subtitle}
              onChange={(e) => updateContent(['home', 'hero', 'subtitle'], e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание
            </label>
            <textarea
              value={content.hero.description}
              onChange={(e) => updateContent(['home', 'hero', 'description'], e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Секция &quot;О виртуальной галерее&quot;</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Заголовок
            </label>
            <input
              type="text"
              value={content.aboutSection.title}
              onChange={(e) => updateContent(['home', 'aboutSection', 'title'], e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание 1
            </label>
            <textarea
              value={content.aboutSection.description1}
              onChange={(e) => updateContent(['home', 'aboutSection', 'description1'], e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание 2
            </label>
            <textarea
              value={content.aboutSection.description2}
              onChange={(e) => updateContent(['home', 'aboutSection', 'description2'], e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Статистика</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(content.stats).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => updateContent(['home', 'stats', key], e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Кнопки и ссылки</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {content.buttons && Object.entries(content.buttons).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {key === 'catalog' && 'Каталог работ'}
                {key === 'virtualGallery' && 'Виртуальная галерея'}
                {key === 'about' && 'О галерее'}
                {key === 'viewAll' && 'Смотреть все'}
                {key === 'learnMore' && 'Узнать больше'}
              </label>
              <input
                type="text"
                value={value || ''}
                onChange={(e) => updateContent(['home', 'buttons', key], e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Заголовки секций</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Популярные работы
            </label>
            <input
              type="text"
              value={content.sections?.popularWorks || ''}
              onChange={(e) => updateContent(['home', 'sections', 'popularWorks'], e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function AboutPageEditor({
  content,
  updateContent,
}: {
  content: PageContent['about']
  updateContent: (path: string[], value: any) => void
}) {
  return (
    <div className="space-y-6">
      {/* О проекте */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">{content.project.title}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Заголовок
            </label>
            <input
              type="text"
              value={content.project.title}
              onChange={(e) => updateContent(['about', 'project', 'title'], e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {content.project.paragraphs.map((para, idx) => (
            <div key={idx}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Абзац {idx + 1}
              </label>
              <textarea
                value={para}
                onChange={(e) => {
                  const newParagraphs = [...content.project.paragraphs]
                  newParagraphs[idx] = e.target.value
                  updateContent(['about', 'project', 'paragraphs'], newParagraphs)
                }}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const newParagraphs = [...content.project.paragraphs, '']
              updateContent(['about', 'project', 'paragraphs'], newParagraphs)
            }}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            + Добавить абзац
          </button>
        </div>
      </div>

      {/* ВГУ */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">{content.university.title}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Заголовок
            </label>
            <input
              type="text"
              value={content.university.title}
              onChange={(e) => updateContent(['about', 'university', 'title'], e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {content.university.paragraphs.map((para, idx) => (
            <div key={idx}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Абзац {idx + 1}
              </label>
              <textarea
                value={para}
                onChange={(e) => {
                  const newParagraphs = [...content.university.paragraphs]
                  newParagraphs[idx] = e.target.value
                  updateContent(['about', 'university', 'paragraphs'], newParagraphs)
                }}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const newParagraphs = [...content.university.paragraphs, '']
              updateContent(['about', 'university', 'paragraphs'], newParagraphs)
            }}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            + Добавить абзац
          </button>
        </div>
      </div>

      {/* Как это работает */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">{content.howItWorks.title}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Заголовок
            </label>
            <input
              type="text"
              value={content.howItWorks.title}
              onChange={(e) => updateContent(['about', 'howItWorks', 'title'], e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {content.howItWorks.steps.map((step, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Шаг {step.number}</h4>
                <button
                  type="button"
                  onClick={() => {
                    const newSteps = content.howItWorks.steps.filter((_, i) => i !== idx)
                    updateContent(['about', 'howItWorks', 'steps'], newSteps)
                  }}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Удалить
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={step.title}
                  onChange={(e) => {
                    const newSteps = [...content.howItWorks.steps]
                    newSteps[idx].title = e.target.value
                    updateContent(['about', 'howItWorks', 'steps'], newSteps)
                  }}
                  placeholder="Название шага"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <textarea
                  value={step.description}
                  onChange={(e) => {
                    const newSteps = [...content.howItWorks.steps]
                    newSteps[idx].description = e.target.value
                    updateContent(['about', 'howItWorks', 'steps'], newSteps)
                  }}
                  placeholder="Описание шага"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const newSteps = [
                ...content.howItWorks.steps,
                {
                  number: content.howItWorks.steps.length + 1,
                  title: '',
                  description: '',
                },
              ]
              updateContent(['about', 'howItWorks', 'steps'], newSteps)
            }}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            + Добавить шаг
          </button>
        </div>
      </div>

      {/* Технологии */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">{content.technologies.title}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Заголовок
            </label>
            <input
              type="text"
              value={content.technologies.title}
              onChange={(e) => updateContent(['about', 'technologies', 'title'], e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание
            </label>
            <textarea
              value={content.technologies.description}
              onChange={(e) => updateContent(['about', 'technologies', 'description'], e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {content.technologies.items.map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Технология {idx + 1}</h4>
                <button
                  type="button"
                  onClick={() => {
                    const newItems = content.technologies.items.filter((_, i) => i !== idx)
                    updateContent(['about', 'technologies', 'items'], newItems)
                  }}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Удалить
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => {
                    const newItems = [...content.technologies.items]
                    newItems[idx].name = e.target.value
                    updateContent(['about', 'technologies', 'items'], newItems)
                  }}
                  placeholder="Название технологии"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <textarea
                  value={item.description}
                  onChange={(e) => {
                    const newItems = [...content.technologies.items]
                    newItems[idx].description = e.target.value
                    updateContent(['about', 'technologies', 'items'], newItems)
                  }}
                  placeholder="Описание"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const newItems = [...content.technologies.items, { name: '', description: '' }]
              updateContent(['about', 'technologies', 'items'], newItems)
            }}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            + Добавить технологию
          </button>
        </div>
      </div>

      {/* Контакты */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">{content.contacts.title}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Заголовок
            </label>
            <input
              type="text"
              value={content.contacts.title}
              onChange={(e) => updateContent(['about', 'contacts', 'title'], e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {content.contacts.items.map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Контакт {idx + 1}</h4>
                <button
                  type="button"
                  onClick={() => {
                    const newItems = content.contacts.items.filter((_, i) => i !== idx)
                    updateContent(['about', 'contacts', 'items'], newItems)
                  }}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Удалить
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => {
                    const newItems = [...content.contacts.items]
                    newItems[idx].label = e.target.value
                    updateContent(['about', 'contacts', 'items'], newItems)
                  }}
                  placeholder="Название (например: Email)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => {
                    const newItems = [...content.contacts.items]
                    newItems[idx].value = e.target.value
                    updateContent(['about', 'contacts', 'items'], newItems)
                  }}
                  placeholder="Значение (например: art@vsu.by)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const newItems = [...content.contacts.items, { label: '', value: '' }]
              updateContent(['about', 'contacts', 'items'], newItems)
            }}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            + Добавить контакт
          </button>
        </div>
      </div>
    </div>
  )
}

function SettingsEditor({
  content,
  updateContent,
}: {
  content: PageContent['settings']
  updateContent: (path: string[], value: any) => void
}) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Основные настройки</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название сайта
            </label>
            <input
              type="text"
              value={content.siteName}
              onChange={(e) => updateContent(['settings', 'siteName'], e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание сайта
            </label>
            <textarea
              value={content.siteDescription}
              onChange={(e) => updateContent(['settings', 'siteDescription'], e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Навигация</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {content.navigation && Object.entries(content.navigation).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {key === 'home' && 'Главная'}
                {key === 'catalog' && 'Каталог'}
                {key === 'virtualGallery' && 'Виртуальная галерея'}
                {key === 'about' && 'О галерее'}
              </label>
              <input
                type="text"
                value={value || ''}
                onChange={(e) => updateContent(['settings', 'navigation', key], e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Каталог</h3>
        <div className="space-y-4">
          {content.catalog && Object.entries(content.catalog).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {key === 'title' && 'Заголовок страницы'}
                {key === 'searchPlaceholder' && 'Плейсхолдер поиска'}
                {key === 'searchLabel' && 'Метка поля поиска'}
                {key === 'categoryLabel' && 'Метка категории'}
                {key === 'yearLabel' && 'Метка года'}
                {key === 'allCategories' && 'Все категории'}
                {key === 'allYears' && 'Все годы'}
                {key === 'only3D' && 'Только с 3D моделями'}
                {key === 'foundWorks' && 'Найдено работ'}
                {key === 'noWorksFound' && 'Работы не найдены'}
                {key === 'tryDifferentFilters' && 'Подсказка при отсутствии результатов'}
              </label>
              {key === 'searchPlaceholder' || key === 'tryDifferentFilters' ? (
                <textarea
                  value={value || ''}
                  onChange={(e) => updateContent(['settings', 'catalog', key], e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <input
                  type="text"
                  value={value || ''}
                  onChange={(e) => updateContent(['settings', 'catalog', key], e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Страница экспоната</h3>
        <div className="space-y-4">
          {content.exhibit && Object.entries(content.exhibit).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {key === 'backToCatalog' && 'Вернуться в каталог'}
                {key === 'editButton' && 'Кнопка редактирования'}
                {key === 'model3D' && '3D Модель'}
                {key === 'description' && 'Описание'}
                {key === 'aboutAuthor' && 'Об авторе'}
                {key === 'additionalInfo' && 'Дополнительная информация'}
                {key === 'creationInfo' && 'Информация о создании'}
                {key === 'technicalSpecs' && 'Технические характеристики'}
                {key === 'interestingFacts' && 'Интересные факты'}
                {key === 'qrCode' && 'QR-код'}
                {key === 'qrCodeDescription' && 'Описание QR-кода'}
                {key === 'navigation' && 'Навигация'}
                {key === 'previous' && 'Предыдущий'}
                {key === 'next' && 'Следующий'}
                {key === 'creationDate' && 'Дата создания'}
                {key === 'dimensions' && 'Размеры'}
                {key === 'location' && 'Местонахождение'}
                {key === 'inventoryNumber' && 'Инвентарный номер'}
                {key === 'author' && 'Автор/мастер'}
                {key === 'course' && 'Курс'}
                {key === 'group' && 'Группа'}
                {key === 'supervisor' && 'Научный руководитель'}
              </label>
              <input
                type="text"
                value={value || ''}
                onChange={(e) => updateContent(['settings', 'exhibit', key], e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Футер</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание
            </label>
            <textarea
              value={content.footer.description}
              onChange={(e) => updateContent(['settings', 'footer', 'description'], e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Копирайт
            </label>
            <input
              type="text"
              value={content.footer.copyright}
              onChange={(e) => updateContent(['settings', 'footer', 'copyright'], e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Заголовок навигации
            </label>
            <input
              type="text"
              value={content.footer.navigationTitle || ''}
              onChange={(e) => updateContent(['settings', 'footer', 'navigationTitle'], e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Заголовок контактов
            </label>
            <input
              type="text"
              value={content.footer.contactsTitle || ''}
              onChange={(e) => updateContent(['settings', 'footer', 'contactsTitle'], e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Адрес контактов
            </label>
            <textarea
              value={content.footer.contactsAddress || ''}
              onChange={(e) => updateContent(['settings', 'footer', 'contactsAddress'], e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Каждая строка - отдельная строка адреса"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ссылки в футере
            </label>
            {content.footer.links.map((link, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => {
                    const newLinks = [...content.footer.links]
                    newLinks[idx].label = e.target.value
                    updateContent(['settings', 'footer', 'links'], newLinks)
                  }}
                  placeholder="Название"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  value={link.href}
                  onChange={(e) => {
                    const newLinks = [...content.footer.links]
                    newLinks[idx].href = e.target.value
                    updateContent(['settings', 'footer', 'links'], newLinks)
                  }}
                  placeholder="/путь"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newLinks = content.footer.links.filter((_, i) => i !== idx)
                    updateContent(['settings', 'footer', 'links'], newLinks)
                  }}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  Удалить
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newLinks = [...content.footer.links, { label: '', href: '' }]
                updateContent(['settings', 'footer', 'links'], newLinks)
              }}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              + Добавить ссылку
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

