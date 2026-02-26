/** Блок текста */
export interface GuideTextBlock {
  type: 'text'
  content: string
}

/** Блок изображения (src пустой = плейсхолдер «вставьте изображение») */
export interface GuideImageBlock {
  type: 'image'
  src: string
  alt?: string
}

/** Блок «Частые вопросы» */
export interface GuideFaqBlock {
  type: 'faq'
  items: Array<{ q: string; a: string }>
}

export type GuideBlock = GuideTextBlock | GuideImageBlock | GuideFaqBlock

export interface GuideSection {
  id: string
  title: string
  blocks: GuideBlock[]
}

export interface GuideContentData {
  intro?: string
  sections: GuideSection[]
}
