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
  buttons: {
    catalog: string
    virtualGallery: string
    about: string
    viewAll: string
    learnMore: string
  }
  sections: {
    popularWorks: string
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
    navigationTitle: string
    contactsTitle: string
    contactsAddress: string
  }
  navigation: {
    home: string
    catalog: string
    virtualGallery: string
    about: string
  }
  catalog: {
    title: string
    searchPlaceholder: string
    searchLabel: string
    categoryLabel: string
    yearLabel: string
    allCategories: string
    allYears: string
    only3D: string
    foundWorks: string
    noWorksFound: string
    tryDifferentFilters: string
  }
  exhibit: {
    backToCatalog: string
    editButton: string
    model3D: string
    description: string
    aboutAuthor: string
    additionalInfo: string
    creationInfo: string
    technicalSpecs: string
    interestingFacts: string
    qrCode: string
    qrCodeDescription: string
    navigation: string
    previous: string
    next: string
    creationDate: string
    dimensions: string
    location: string
    inventoryNumber: string
    author: string
    course: string
    group: string
    supervisor: string
  }
}

export interface PageContent {
  home: HomePageContent
  about: AboutPageContent
  settings: SiteSettings
}







