'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  GuideContentData,
  GuideSection,
  GuideBlock,
  GuideTextBlock,
  GuideImageBlock,
  GuideFaqBlock,
} from '@/types/guide'

interface GuideEditorProps {
  onSave?: () => void
}

export default function GuideEditor({ onSave }: GuideEditorProps) {
  const [data, setData] = useState<GuideContentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/guide-content')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!data) return
    setSaving(true)
    try {
      const res = await fetch('/api/guide-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      })
      if (res.ok) {
        alert('Руководство сохранено.')
        onSave?.()
      } else {
        const err = await res.json()
        alert(err.error || 'Ошибка сохранения')
      }
    } catch (e) {
      console.error(e)
      alert('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const setIntro = (intro: string) => setData((d) => (d ? { ...d, intro } : null))
  const setSections = (sections: GuideSection[]) =>
    setData((d) => (d ? { ...d, sections } : null))

  const updateSection = (index: number, section: GuideSection) => {
    setSections(
      data!.sections.map((s, i) => (i === index ? section : s))
    )
  }

  const addSection = () => {
    const id = `section-${Date.now()}`
    setSections([
      ...data!.sections,
      { id, title: 'Новая секция', blocks: [{ type: 'text', content: '' }] },
    ])
  }

  const removeSection = (index: number) => {
    if (!confirm('Удалить эту секцию?')) return
    setSections(data!.sections.filter((_, i) => i !== index))
  }

  const addBlock = (sectionIndex: number, type: 'text' | 'image' | 'faq') => {
    const section = data!.sections[sectionIndex]
    let block: GuideBlock
    if (type === 'text') block = { type: 'text', content: '' }
    else if (type === 'image') block = { type: 'image', src: '', alt: '' }
    else block = { type: 'faq', items: [{ q: '', a: '' }] }
    updateSection(sectionIndex, {
      ...section,
      blocks: [...section.blocks, block],
    })
  }

  const removeBlock = (sectionIndex: number, blockIndex: number) => {
    const section = data!.sections[sectionIndex]
    updateSection(sectionIndex, {
      ...section,
      blocks: section.blocks.filter((_, i) => i !== blockIndex),
    })
  }

  const updateBlock = (sectionIndex: number, blockIndex: number, block: GuideBlock) => {
    const section = data!.sections[sectionIndex]
    updateSection(sectionIndex, {
      ...section,
      blocks: section.blocks.map((b, i) => (i === blockIndex ? block : b)),
    })
  }

  const uploadImage = async (file: File): Promise<string> => {
    const form = new FormData()
    form.append('file', file)
    form.append('type', 'image')
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    if (!res.ok) throw new Error('Ошибка загрузки')
    const json = await res.json()
    return json.path
  }

  if (loading) return <div className="py-8 text-center text-gray-600">Загрузка...</div>
  if (!data) return <div className="py-8 text-center text-gray-600">Нет данных</div>

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Редактор руководства пользователя</h2>
        <div className="flex gap-2">
          <a
            href="/user-guide"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Открыть страницу
          </a>
          <button
            onClick={save}
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Подзаголовок (краткое описание под заголовком страницы)
        </label>
        <textarea
          value={data.intro ?? ''}
          onChange={(e) => setIntro(e.target.value)}
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          placeholder="Подробное описание работы с виртуальной галереей..."
        />
      </div>

      <div className="space-y-8">
        {data.sections.map((section, sectionIndex) => (
          <section
            key={section.id}
            className="border border-gray-200 rounded-lg p-6 bg-gray-50/50"
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">ID секции (для якоря)</label>
                  <input
                    type="text"
                    value={section.id}
                    onChange={(e) =>
                      updateSection(sectionIndex, { ...section, id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="intro"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Заголовок секции</label>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) =>
                      updateSection(sectionIndex, { ...section, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Введение"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeSection(sectionIndex)}
                className="text-red-600 hover:text-red-800 text-sm font-medium whitespace-nowrap"
              >
                Удалить секцию
              </button>
            </div>

            <div className="space-y-4">
              {section.blocks.map((block, blockIndex) => (
                <div
                  key={blockIndex}
                  className="bg-white border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {block.type === 'text' && 'Текст'}
                      {block.type === 'image' && 'Изображение'}
                      {block.type === 'faq' && 'Частые вопросы'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBlock(sectionIndex, blockIndex)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Удалить блок
                    </button>
                  </div>

                  {block.type === 'text' && (
                    <textarea
                      value={block.content}
                      onChange={(e) =>
                        updateBlock(sectionIndex, blockIndex, {
                          ...block,
                          content: e.target.value,
                        } as GuideTextBlock)
                      }
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Текст абзаца..."
                    />
                  )}

                  {block.type === 'image' && (
                    <div className="space-y-2">
                      {block.src ? (
                        <div className="flex items-start gap-4">
                          <img
                            src={block.src}
                            alt={block.alt || ''}
                            className="max-h-40 rounded object-contain border border-gray-200"
                          />
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Подпись (alt)</label>
                            <input
                              type="text"
                              value={block.alt ?? ''}
                              onChange={(e) =>
                                updateBlock(sectionIndex, blockIndex, {
                                  ...block,
                                  alt: e.target.value,
                                } as GuideImageBlock)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="Описание изображения"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateBlock(sectionIndex, blockIndex, {
                                  ...block,
                                  src: '',
                                } as GuideImageBlock)
                              }
                              className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                            >
                              Убрать изображение
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-500 mb-2">
                            {block.alt || 'Вставьте изображение (загрузите файл или оставьте подпись для плейсхолдера)'}
                          </p>
                          <input
                            type="text"
                            value={block.alt ?? ''}
                            onChange={(e) =>
                              updateBlock(sectionIndex, blockIndex, {
                                ...block,
                                alt: e.target.value,
                              } as GuideImageBlock)
                            }
                            className="w-full max-w-md mx-auto px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                            placeholder="Подпись / описание для плейсхолдера"
                          />
                          <label className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700 text-sm">
                            Загрузить изображение
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                try {
                                  const path = await uploadImage(file)
                                  updateBlock(sectionIndex, blockIndex, {
                                    ...block,
                                    src: path,
                                  } as GuideImageBlock)
                                } catch (err) {
                                  alert('Ошибка загрузки изображения')
                                }
                                e.target.value = ''
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {block.type === 'faq' && (
                    <div className="space-y-3">
                      {(block as GuideFaqBlock).items.map((item, i) => (
                        <div key={i} className="flex gap-2 items-start border-b border-gray-100 pb-2">
                          <div className="flex-1 space-y-1">
                            <input
                              type="text"
                              value={item.q}
                              onChange={(e) => {
                                const items = [...(block as GuideFaqBlock).items]
                                items[i] = { ...item, q: e.target.value }
                                updateBlock(sectionIndex, blockIndex, {
                                  type: 'faq',
                                  items,
                                } as GuideFaqBlock)
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="Вопрос"
                            />
                            <input
                              type="text"
                              value={item.a}
                              onChange={(e) => {
                                const items = [...(block as GuideFaqBlock).items]
                                items[i] = { ...item, a: e.target.value }
                                updateBlock(sectionIndex, blockIndex, {
                                  type: 'faq',
                                  items,
                                } as GuideFaqBlock)
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="Ответ"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const items = (block as GuideFaqBlock).items.filter((_, j) => j !== i)
                              updateBlock(sectionIndex, blockIndex, {
                                type: 'faq',
                                items: items.length ? items : [{ q: '', a: '' }],
                              } as GuideFaqBlock)
                            }}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const items = [...(block as GuideFaqBlock).items, { q: '', a: '' }]
                          updateBlock(sectionIndex, blockIndex, { type: 'faq', items } as GuideFaqBlock)
                        }}
                        className="text-sm text-primary-600 hover:text-primary-800"
                      >
                        + Добавить вопрос-ответ
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <span className="text-sm text-gray-500">Добавить блок:</span>
                <button
                  type="button"
                  onClick={() => addBlock(sectionIndex, 'text')}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Текст
                </button>
                <button
                  type="button"
                  onClick={() => addBlock(sectionIndex, 'image')}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Изображение
                </button>
                <button
                  type="button"
                  onClick={() => addBlock(sectionIndex, 'faq')}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Вопрос-ответ
                </button>
              </div>
            </div>
          </section>
        ))}

        <button
          type="button"
          onClick={addSection}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-400 hover:text-primary-600 font-medium"
        >
          + Добавить секцию
        </button>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : 'Сохранить руководство'}
        </button>
      </div>
    </div>
  )
}
