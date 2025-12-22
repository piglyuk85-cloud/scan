export interface HomePageContent {
  hero: {
    title: string
    subtitle: string
    description: string
  }
  aboutSection: {
    title: string
    description1: string
    description2: string
  }
  stats: {
    works: string
    models: string
    qrCodes: string
    access: string
  }
}

export interface AboutPageContent {
  project: {
    title: string
    paragraphs: string[]
  }
  university: {
    title: string
    paragraphs: string[]
  }
  howItWorks: {
    title: string
    steps: Array<{
      number: number
      title: string
      description: string
    }>
  }
  technologies: {
    title: string
    description: string
    items: Array<{
      name: string
      description: string
    }>
  }
  contacts: {
    title: string
    items: Array<{
      label: string
      value: string
    }>
  }
}

export interface SiteSettings {
  siteName: string
  siteDescription: string
  footer: {
    description: string
    copyright: string
    links: Array<{
      label: string
      href: string
    }>
  }
}

export interface PageContent {
  home: HomePageContent
  about: AboutPageContent
  settings: SiteSettings
}

