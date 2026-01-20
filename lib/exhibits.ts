import { Exhibit } from '@/types/exhibit'
import { prisma } from './prisma'

function formatExhibit(exhibit: any): Exhibit {
  return {
    id: exhibit.id,
    inventoryNumber: exhibit.inventoryNumber || undefined,
    title: exhibit.title,
    description: exhibit.description,
    fullDescription: exhibit.fullDescription || undefined,
    creationDate: exhibit.creationDate || undefined,
    studentName: exhibit.studentName || undefined,
    studentCourse: exhibit.studentCourse || undefined,
    studentGroup: exhibit.studentGroup || undefined,
    supervisor: exhibit.supervisor || undefined,
    supervisorPosition: exhibit.supervisorPosition || undefined,
    supervisorRank: exhibit.supervisorRank || undefined,
    supervisorDepartment: exhibit.supervisorDepartment || undefined,
    dimensions: exhibit.dimensions || undefined,
    currentLocation: exhibit.currentLocation || undefined,
    isPublic: exhibit.isPublic ?? undefined,
    category: exhibit.category,
    year: exhibit.creationDate || exhibit.year || undefined,
    modelPath: exhibit.modelPath || undefined,
    has3DModel: exhibit.has3DModel,
    previewImage: exhibit.previewImage || undefined,
    images: JSON.parse(exhibit.images || '[]') as string[],
    creationInfo: exhibit.creationInfo || undefined,
    technicalSpecs: JSON.parse(exhibit.technicalSpecs || '{}') as Record<string, string>,
    interestingFacts: JSON.parse(exhibit.interestingFacts || '[]') as string[],
    relatedExhibits: JSON.parse(exhibit.relatedExhibits || '[]') as string[],
    galleryPositionX: exhibit.galleryPositionX ?? undefined,
    galleryPositionY: exhibit.galleryPositionY ?? undefined,
    galleryPositionZ: exhibit.galleryPositionZ ?? undefined,
    galleryScale: exhibit.galleryScale ?? undefined,
    galleryRotationY: exhibit.galleryRotationY ?? undefined,
    visibleInGallery: exhibit.visibleInGallery ?? undefined,
  }
}

export async function getExhibits(includePrivate: boolean = false): Promise<Exhibit[]> {
  const whereClause = includePrivate ? {} : { isPublic: true }
  
  const exhibits = await prisma.exhibit.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  })

  return exhibits.map(formatExhibit)
}

export async function getExhibitById(id: string, includePrivate: boolean = false): Promise<Exhibit | undefined> {
  const exhibit = await prisma.exhibit.findUnique({
    where: { id },
  })

  if (!exhibit) return undefined

  if (!exhibit.isPublic && !includePrivate) {
    return undefined
  }

  return formatExhibit(exhibit)
}

export async function getExhibitsByCategory(category: string): Promise<Exhibit[]> {
  const exhibits = await prisma.exhibit.findMany({
    where: { category },
    orderBy: { createdAt: 'desc' },
  })

  return exhibits.map(formatExhibit)
}

export async function searchExhibits(query: string): Promise<Exhibit[]> {
  const lowerQuery = query.toLowerCase()
  const exhibits = await prisma.exhibit.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return exhibits
    .filter(
      (exhibit) =>
        exhibit.title.toLowerCase().includes(lowerQuery) ||
        exhibit.description.toLowerCase().includes(lowerQuery) ||
        exhibit.category.toLowerCase().includes(lowerQuery) ||
        (exhibit.studentName && exhibit.studentName.toLowerCase().includes(lowerQuery))
    )
    .map(formatExhibit)
}

export async function getCategories(): Promise<string[]> {
  const exhibits = await prisma.exhibit.findMany({
    select: { category: true },
    distinct: ['category'],
  })
  return exhibits.map((e) => e.category).sort()
}

export async function getYears(): Promise<string[]> {
  const exhibits = await prisma.exhibit.findMany({
    where: { year: { not: null } },
    select: { year: true },
    distinct: ['year'],
  })
  return exhibits
    .map((e) => e.year)
    .filter((year): year is string => !!year)
    .sort()
}
