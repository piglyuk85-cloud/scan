import { Exhibit } from '@/types/exhibit'
import { prisma } from './prisma'
import type { Prisma, PrismaClient } from '@prisma/client'
import path from 'path'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'

export const exhibitInclude = {
  category: true,
  student: true,
  supervisor: { include: { department: true } },
  mediaResources: true,
  gallerySettings: true,
}

/** Минимальный select для плитки каталога (без gallerySettings и тяжёлых JSON). */
const exhibitListSelect = {
  id: true,
  title: true,
  description: true,
  creationDate: true,
  isPublic: true,
  categoryId: true,
  inventoryNumber: true,
  category: { select: { name: true } },
  student: { select: { name: true, course: true, groupCode: true } },
  supervisor: {
    select: {
      id: true,
      name: true,
      position: true,
      rank: true,
      departmentId: true,
      department: { select: { name: true } },
    },
  },
  mediaResources: { select: { filePath: true, fileType: true, isPrimary: true } },
} as const

export function formatExhibit(exhibit: any): Exhibit {
  const media = exhibit.mediaResources || []
  const modelMedia = media.find((m: any) => m.fileType === 'model')
  const primaryImage = media.find((m: any) => m.isPrimary && m.fileType === 'image')
  const imagesList = media.filter((m: any) => m.fileType === 'image').map((m: any) => m.filePath)
  const gs = exhibit.gallerySettings

  return {
    id: exhibit.id,
    inventoryNumber: exhibit.inventoryNumber || undefined,
    title: exhibit.title,
    description: exhibit.description,
    fullDescription: exhibit.fullDescription || undefined,
    creationDate: exhibit.creationDate || undefined,
    studentName: exhibit.student?.name || undefined,
    studentCourse: exhibit.student?.course != null ? String(exhibit.student.course) : undefined,
    studentGroup: exhibit.student?.groupCode || undefined,
    supervisorId: exhibit.supervisorId || undefined,
    supervisor: exhibit.supervisor
      ? {
          id: exhibit.supervisor.id,
          name: exhibit.supervisor.name,
          position: exhibit.supervisor.position || undefined,
          rank: exhibit.supervisor.rank || undefined,
          department: exhibit.supervisor.department?.name ?? exhibit.supervisor.departmentId ?? undefined,
        }
      : undefined,
    dimensions: exhibit.dimensions || undefined,
    currentLocation: exhibit.currentLocation || undefined,
    isPublic: exhibit.isPublic ?? undefined,
    category: exhibit.category?.name ?? exhibit.categoryId ?? '',
    year: exhibit.creationDate || undefined,
    modelPath: modelMedia?.filePath || undefined,
    has3DModel: !!modelMedia,
    previewImage: primaryImage?.filePath || imagesList[0] || undefined,
    images: imagesList,
    technicalSpecs: exhibit.technicalSpecs ? (typeof exhibit.technicalSpecs === 'string' ? JSON.parse(exhibit.technicalSpecs || '{}') : exhibit.technicalSpecs) as Record<string, string> : undefined,
    interestingFacts: exhibit.interestingFacts ? (typeof exhibit.interestingFacts === 'string' ? JSON.parse(exhibit.interestingFacts || '[]') : exhibit.interestingFacts) as string[] : undefined,
    galleryPositionX: gs?.posX ?? undefined,
    galleryPositionY: gs?.posY ?? undefined,
    galleryPositionZ: gs?.posZ ?? undefined,
    galleryScale: gs?.scale ?? undefined,
    galleryRotationY: gs?.rotY ?? undefined,
    visibleInGallery: gs?.visibleInGallery ?? undefined,
  }
}

export async function getExhibits(includePrivate: boolean = false): Promise<Exhibit[]> {
  const whereClause = includePrivate ? {} : { isPublic: true }

  const exhibits = await prisma.exhibit.findMany({
    where: whereClause,
    include: exhibitInclude,
    orderBy: { createdAt: 'desc' },
  })

  return exhibits.map(formatExhibit)
}

export interface GetExhibitsPaginatedParams {
  includePrivate?: boolean
  skip?: number
  take?: number
  search?: string
  category?: string
  year?: string
  only3D?: boolean
}

export interface GetExhibitsPaginatedResult {
  exhibits: Exhibit[]
  totalCount: number
}

/**
 * Список экспонатов для каталога: серверная пагинация, поиск и фильтры в БД.
 * Выборка облегчённая (без gallerySettings и тяжёлых полей).
 */
export async function getExhibitsPaginated(params: GetExhibitsPaginatedParams): Promise<GetExhibitsPaginatedResult> {
  const {
    includePrivate = false,
    skip = 0,
    take = 6,
    search = '',
    category = '',
    year = '',
    only3D = false,
  } = params

  const searchTrim = search.trim()
  const conditions: Prisma.ExhibitWhereInput[] = []

  if (!includePrivate) {
    conditions.push({ isPublic: true })
  }

  if (searchTrim) {
    conditions.push({
      OR: [
        { title: { contains: searchTrim } },
        { description: { contains: searchTrim } },
        { category: { name: { contains: searchTrim } } },
        { student: { name: { contains: searchTrim } } },
        { supervisor: { name: { contains: searchTrim } } },
      ],
    })
  }

  if (category && category !== 'all') {
    conditions.push({ category: { name: category } })
  }

  if (year && year !== 'all') {
    conditions.push({ creationDate: year })
  }

  if (only3D) {
    conditions.push({ mediaResources: { some: { fileType: 'model' } } })
  }

  const where = conditions.length > 0 ? { AND: conditions } : {}

  const [exhibits, totalCount] = await Promise.all([
    prisma.exhibit.findMany({
      where,
      select: exhibitListSelect,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.exhibit.count({ where }),
  ])

  const formatted = exhibits.map((row) => formatExhibit(row as any))
  return { exhibits: formatted, totalCount }
}

export async function getExhibitById(id: string, includePrivate: boolean = false): Promise<Exhibit | undefined> {
  const exhibit = await prisma.exhibit.findUnique({
    where: { id },
    include: exhibitInclude,
  })

  if (!exhibit) return undefined
  if (!exhibit.isPublic && !includePrivate) return undefined

  return formatExhibit(exhibit)
}

export async function getExhibitsByCategory(categoryName: string): Promise<Exhibit[]> {
  const exhibits = await prisma.exhibit.findMany({
    where: { category: { name: categoryName } },
    include: exhibitInclude,
    orderBy: { createdAt: 'desc' },
  })
  return exhibits.map(formatExhibit)
}

export async function searchExhibits(query: string): Promise<Exhibit[]> {
  const lowerQuery = query.toLowerCase()
  const exhibits = await prisma.exhibit.findMany({
    include: exhibitInclude,
    orderBy: { createdAt: 'desc' },
  })
  return exhibits
    .filter(
      (exhibit) =>
        exhibit.title.toLowerCase().includes(lowerQuery) ||
        exhibit.description.toLowerCase().includes(lowerQuery) ||
        (exhibit.category?.name && exhibit.category.name.toLowerCase().includes(lowerQuery)) ||
        (exhibit.student?.name && exhibit.student.name.toLowerCase().includes(lowerQuery)) ||
        (exhibit.supervisor?.name && exhibit.supervisor.name.toLowerCase().includes(lowerQuery))
    )
    .map(formatExhibit)
}

export async function getCategories(): Promise<string[]> {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  })
  return categories.map((c) => c.name)
}

export async function getYears(): Promise<string[]> {
  const exhibits = await prisma.exhibit.findMany({
    where: { creationDate: { not: null } },
    select: { creationDate: true },
    distinct: ['creationDate'],
  })
  return exhibits
    .map((e) => e.creationDate)
    .filter((y): y is string => !!y)
    .sort()
}

async function getOrCreateCategory(name: string): Promise<string | null> {
  if (!name?.trim()) return null
  const existing = await prisma.category.findUnique({ where: { name: name.trim() } })
  if (existing) return existing.id
  const created = await prisma.category.create({ data: { name: name.trim() } })
  return created.id
}

async function getOrCreateCategoryWithTx(tx: PrismaClient, name: string): Promise<string | null> {
  if (!name?.trim()) return null
  const existing = await tx.category.findUnique({ where: { name: name.trim() } })
  if (existing) return existing.id
  const created = await tx.category.create({ data: { name: name.trim() } })
  return created.id
}

async function getOrCreateStudent(data: { name?: string; course?: string; groupCode?: string }): Promise<string | null> {
  if (!data.name?.trim()) return null
  const courseNum = data.course ? parseInt(data.course, 10) : null
  const existing = await prisma.student.findFirst({
    where: { name: data.name.trim(), course: courseNum ?? undefined, groupCode: data.groupCode || undefined },
  })
  if (existing) return existing.id
  const created = await prisma.student.create({
    data: {
      name: data.name.trim(),
      course: courseNum ?? undefined,
      groupCode: data.groupCode?.trim() || undefined,
    },
  })
  return created.id
}

async function getOrCreateStudentWithTx(tx: PrismaClient, data: { name?: string; course?: string; groupCode?: string }): Promise<string | null> {
  if (!data.name?.trim()) return null
  const courseNum = data.course ? parseInt(data.course, 10) : null
  const existing = await tx.student.findFirst({
    where: { name: data.name.trim(), course: courseNum ?? undefined, groupCode: data.groupCode || undefined },
  })
  if (existing) return existing.id
  const created = await tx.student.create({
    data: {
      name: data.name.trim(),
      course: courseNum ?? undefined,
      groupCode: data.groupCode?.trim() || undefined,
    },
  })
  return created.id
}

async function getOrCreateDepartment(name: string): Promise<string | null> {
  if (!name?.trim()) return null
  const existing = await prisma.department.findFirst({ where: { name: name.trim() } })
  if (existing) return existing.id
  const created = await prisma.department.create({ data: { name: name.trim() } })
  return created.id
}

async function getOrCreateDepartmentWithTx(tx: PrismaClient, name: string): Promise<string | null> {
  if (!name?.trim()) return null
  const existing = await tx.department.findFirst({ where: { name: name.trim() } })
  if (existing) return existing.id
  const created = await tx.department.create({ data: { name: name.trim() } })
  return created.id
}

async function getOrCreateSupervisor(data: {
  name: string
  position?: string
  rank?: string
  department?: string
}): Promise<string | null> {
  if (!data.name?.trim()) return null
  let departmentId: string | null = null
  if (data.department?.trim()) {
    departmentId = await getOrCreateDepartment(data.department)
  }
  const existing = await prisma.supervisor.findFirst({
    where: { name: data.name.trim(), departmentId: departmentId ?? undefined },
  })
  if (existing) return existing.id
  const created = await prisma.supervisor.create({
    data: {
      name: data.name.trim(),
      position: data.position?.trim() || undefined,
      rank: data.rank?.trim() || undefined,
      departmentId,
    },
  })
  return created.id
}

async function getOrCreateSupervisorWithTx(tx: PrismaClient, data: {
  name: string
  position?: string
  rank?: string
  department?: string
}): Promise<string | null> {
  if (!data.name?.trim()) return null
  let departmentId: string | null = null
  if (data.department?.trim()) {
    departmentId = await getOrCreateDepartmentWithTx(tx, data.department)
  }
  const existing = await tx.supervisor.findFirst({
    where: { name: data.name.trim(), departmentId: departmentId ?? undefined },
  })
  if (existing) return existing.id
  const created = await tx.supervisor.create({
    data: {
      name: data.name.trim(),
      position: data.position?.trim() || undefined,
      rank: data.rank?.trim() || undefined,
      departmentId,
    },
  })
  return created.id
}

/** Преобразует публичный путь (URL) в путь к файлу на диске. Возвращает null, если путь не в storage или public/images. */
function publicPathToFsPath(publicPath: string): string | null {
  const normalized = publicPath.startsWith('/') ? publicPath : `/${publicPath}`
  if (normalized.startsWith('/api/storage/')) {
    const rel = normalized.replace(/^\/api\/storage\/?/, '')
    return path.join(process.cwd(), 'storage', ...rel.split('/'))
  }
  if (normalized.startsWith('/images/')) {
    const rel = normalized.replace(/^\/images\/?/, '')
    return path.join(process.cwd(), 'public', 'images', ...rel.split('/'))
  }
  return null
}

/** Удаляет файл по публичному пути. Игнорирует отсутствие файла. Логирует ошибки. */
async function deleteFileByPublicPath(publicPath: string): Promise<void> {
  const fsPath = publicPathToFsPath(publicPath)
  if (!fsPath) return
  try {
    if (existsSync(fsPath)) {
      await unlink(fsPath)
    }
  } catch (err) {
    console.error('[exhibits] deleteFileByPublicPath: не удалось удалить файл', { publicPath, fsPath, error: err })
  }
}

export async function createExhibitFromFlat(exhibit: Exhibit, exhibitId?: string): Promise<Exhibit> {
  const id = exhibitId || exhibit.id || `exhibit-${Date.now()}`
  try {
    const withRelations = await prisma.$transaction(async (tx) => {
      const categoryId = await getOrCreateCategoryWithTx(tx, exhibit.category || '')
      const studentId = await getOrCreateStudentWithTx(tx, {
        name: exhibit.studentName,
        course: exhibit.studentCourse,
        groupCode: exhibit.studentGroup,
      })
      const supervisorId = exhibit.supervisor?.name
        ? await getOrCreateSupervisorWithTx(tx, {
            name: exhibit.supervisor.name,
            position: exhibit.supervisor.position,
            rank: exhibit.supervisor.rank,
            department: exhibit.supervisor.department,
          })
        : null

      const created = await tx.exhibit.create({
        data: {
          id,
          inventoryNumber: exhibit.inventoryNumber?.trim() || null,
          title: exhibit.title,
          description: exhibit.description,
          fullDescription: exhibit.fullDescription || '',
          creationDate: exhibit.creationDate || null,
          categoryId,
          studentId,
          supervisorId,
          dimensions: exhibit.dimensions || null,
          currentLocation: exhibit.currentLocation || null,
          isPublic: exhibit.isPublic ?? true,
          technicalSpecs: typeof exhibit.technicalSpecs === 'object' ? JSON.stringify(exhibit.technicalSpecs || {}) : (exhibit.technicalSpecs as string | undefined) ?? '{}',
          interestingFacts: Array.isArray(exhibit.interestingFacts) ? JSON.stringify(exhibit.interestingFacts) : (exhibit.interestingFacts as string | undefined) ?? '[]',
        },
      })

      const mediaToCreate: { exhibitId: string; filePath: string; fileType: string; isPrimary: boolean }[] = []
      if (exhibit.modelPath) {
        mediaToCreate.push({ exhibitId: created.id, filePath: exhibit.modelPath, fileType: 'model', isPrimary: false })
      }
      if (exhibit.previewImage) {
        mediaToCreate.push({ exhibitId: created.id, filePath: exhibit.previewImage, fileType: 'image', isPrimary: true })
      }
      const otherImages = (exhibit.images || []).filter((p) => p && p !== exhibit.previewImage)
      otherImages.forEach((filePath) => {
        mediaToCreate.push({ exhibitId: created.id, filePath, fileType: 'image', isPrimary: false })
      })
      if (mediaToCreate.length > 0) {
        await tx.mediaResource.createMany({ data: mediaToCreate })
      }

      if (
        exhibit.galleryPositionX != null ||
        exhibit.galleryPositionY != null ||
        exhibit.galleryPositionZ != null ||
        exhibit.galleryScale != null ||
        exhibit.galleryRotationY != null ||
        exhibit.visibleInGallery != null
      ) {
        await tx.gallerySettings.create({
          data: {
            exhibitId: created.id,
            posX: exhibit.galleryPositionX ?? null,
            posY: exhibit.galleryPositionY ?? null,
            posZ: exhibit.galleryPositionZ ?? null,
            scale: exhibit.galleryScale ?? null,
            rotY: exhibit.galleryRotationY ?? null,
            visibleInGallery: exhibit.visibleInGallery ?? true,
          },
        })
      }

      return tx.exhibit.findUnique({
        where: { id: created.id },
        include: exhibitInclude,
      })
    })

    if (!withRelations) {
      throw new Error('createExhibitFromFlat: экспонат не найден после создания')
    }
    return formatExhibit(withRelations)
  } catch (error) {
    if (error instanceof Error) {
      console.error('[exhibits] createExhibitFromFlat: ошибка транзакции', {
        exhibitId: id,
        step: 'exhibit | media | gallerySettings',
        message: error.message,
        stack: error.stack,
      })
    } else {
      console.error('[exhibits] createExhibitFromFlat: ошибка транзакции', { exhibitId: id, error })
    }
    throw error
  }
}

export async function updateExhibitFromFlat(id: string, exhibit: Exhibit): Promise<Exhibit> {
  let oldMediaPaths: string[] = []
  try {
    const oldMedia = await prisma.mediaResource.findMany({
      where: { exhibitId: id },
      select: { filePath: true },
    })
    oldMediaPaths = oldMedia.map((m) => m.filePath)
  } catch (error) {
    console.error('[exhibits] updateExhibitFromFlat: не удалось загрузить старые медиа перед транзакцией', { exhibitId: id, error })
    throw error
  }

  const newMediaSet = new Set<string>([
    ...(exhibit.modelPath ? [exhibit.modelPath] : []),
    ...(exhibit.previewImage ? [exhibit.previewImage] : []),
    ...(exhibit.images || []).filter(Boolean),
  ])

  try {
    const withRelations = await prisma.$transaction(async (tx) => {
      const categoryId = await getOrCreateCategoryWithTx(tx, exhibit.category || '')
      const studentId = await getOrCreateStudentWithTx(tx, {
        name: exhibit.studentName,
        course: exhibit.studentCourse,
        groupCode: exhibit.studentGroup,
      })
      const supervisorId = exhibit.supervisor?.name
        ? await getOrCreateSupervisorWithTx(tx, {
            name: exhibit.supervisor.name,
            position: exhibit.supervisor.position,
            rank: exhibit.supervisor.rank,
            department: exhibit.supervisor.department,
          })
        : null

      await tx.exhibit.update({
        where: { id },
        data: {
          inventoryNumber: exhibit.inventoryNumber?.trim() || null,
          title: exhibit.title,
          description: exhibit.description,
          fullDescription: exhibit.fullDescription || '',
          creationDate: exhibit.creationDate || null,
          categoryId,
          studentId,
          supervisorId,
          dimensions: exhibit.dimensions || null,
          currentLocation: exhibit.currentLocation || null,
          isPublic: exhibit.isPublic ?? true,
          technicalSpecs: typeof exhibit.technicalSpecs === 'object' ? JSON.stringify(exhibit.technicalSpecs || {}) : (exhibit.technicalSpecs as string | undefined) ?? '{}',
          interestingFacts: Array.isArray(exhibit.interestingFacts) ? JSON.stringify(exhibit.interestingFacts) : (exhibit.interestingFacts as string | undefined) ?? '[]',
        },
      })

      await tx.mediaResource.deleteMany({ where: { exhibitId: id } })
      const mediaToCreate: { exhibitId: string; filePath: string; fileType: string; isPrimary: boolean }[] = []
      if (exhibit.modelPath) {
        mediaToCreate.push({ exhibitId: id, filePath: exhibit.modelPath, fileType: 'model', isPrimary: false })
      }
      if (exhibit.previewImage) {
        mediaToCreate.push({ exhibitId: id, filePath: exhibit.previewImage, fileType: 'image', isPrimary: true })
      }
      ;(exhibit.images || []).filter((p) => p).forEach((filePath) => {
        if (filePath !== exhibit.previewImage) {
          mediaToCreate.push({ exhibitId: id, filePath, fileType: 'image', isPrimary: false })
        }
      })
      if (mediaToCreate.length > 0) {
        await tx.mediaResource.createMany({ data: mediaToCreate })
      }

      await tx.gallerySettings.deleteMany({ where: { exhibitId: id } })
      if (
        exhibit.galleryPositionX != null ||
        exhibit.galleryPositionY != null ||
        exhibit.galleryPositionZ != null ||
        exhibit.galleryScale != null ||
        exhibit.galleryRotationY != null ||
        exhibit.visibleInGallery != null
      ) {
        await tx.gallerySettings.create({
          data: {
            exhibitId: id,
            posX: exhibit.galleryPositionX ?? null,
            posY: exhibit.galleryPositionY ?? null,
            posZ: exhibit.galleryPositionZ ?? null,
            scale: exhibit.galleryScale ?? null,
            rotY: exhibit.galleryRotationY ?? null,
            visibleInGallery: exhibit.visibleInGallery ?? true,
          },
        })
      }

      return tx.exhibit.findUnique({
        where: { id },
        include: exhibitInclude,
      })
    })

    if (!withRelations) {
      throw new Error('updateExhibitFromFlat: экспонат не найден после обновления')
    }

    for (const publicPath of oldMediaPaths) {
      if (!newMediaSet.has(publicPath)) {
        await deleteFileByPublicPath(publicPath)
      }
    }

    return formatExhibit(withRelations)
  } catch (error) {
    if (error instanceof Error) {
      console.error('[exhibits] updateExhibitFromFlat: ошибка транзакции', {
        exhibitId: id,
        step: 'exhibit update | media delete/create | gallerySettings delete/create',
        message: error.message,
        stack: error.stack,
      })
    } else {
      console.error('[exhibits] updateExhibitFromFlat: ошибка транзакции', { exhibitId: id, error })
    }
    throw error
  }
}
