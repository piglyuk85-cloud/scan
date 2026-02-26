import { NextRequest, NextResponse } from 'next/server'
import { Exhibit } from '@/types/exhibit'
import { getExhibits, getExhibitsPaginated, createExhibitFromFlat, getCategories, getYears } from '@/lib/exhibits'
import { prisma } from '@/lib/prisma'
import { getAdminFromRequest } from '@/lib/auth'

// GET - список экспонатов (с пагинацией для каталога или полный список для админки)
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request)
    const isAdmin = !!admin
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page')
    const take = searchParams.get('take') ?? searchParams.get('limit')
    const search = searchParams.get('search') ?? ''
    const category = searchParams.get('category') ?? ''
    const year = searchParams.get('year') ?? ''
    const only3D = searchParams.get('only3D') === 'true' || searchParams.get('only3D') === '1'
    const includeMeta = searchParams.get('includeMeta') === 'true' || searchParams.get('includeMeta') === '1'

    const usePaginated = page != null || take != null || search !== '' || category !== '' || year !== '' || only3D

    if (usePaginated) {
      const skip = page ? Math.max(0, (parseInt(page, 10) - 1) * (take ? parseInt(take, 10) : 6)) : 0
      const takeNum = take ? Math.min(100, Math.max(1, parseInt(take, 10))) : 6
      const result = await getExhibitsPaginated({
        includePrivate: isAdmin,
        skip,
        take: takeNum,
        search: search || undefined,
        category: category || undefined,
        year: year || undefined,
        only3D,
      })
      const body: { exhibits: Exhibit[]; totalCount: number; categories?: string[]; years?: string[] } = {
        exhibits: result.exhibits,
        totalCount: result.totalCount,
      }
      if (includeMeta) {
        const [categories, years] = await Promise.all([getCategories(), getYears()])
        body.categories = categories
        body.years = years
      }
      return NextResponse.json(body)
    }

    const exhibits = await getExhibits(isAdmin)
    return NextResponse.json(exhibits)
  } catch (error) {
    console.error('Ошибка при загрузке экспонатов:', error)
    return NextResponse.json({ error: 'Ошибка при загрузке экспонатов' }, { status: 500 })
  }
}

// POST - создать новый экспонат (только для авторизованного админа)
export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request)
  if (!admin) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
  }

  try {
    const exhibit: Exhibit = await request.json()

    if (!exhibit.title || !exhibit.description || !exhibit.category) {
      return NextResponse.json({ error: 'Заполните все обязательные поля' }, { status: 400 })
    }

    const exhibitId = exhibit.id || `exhibit-${Date.now()}`
    const existing = await prisma.exhibit.findUnique({ where: { id: exhibitId } })
    if (existing) {
      return NextResponse.json({ error: 'Экспонат с таким ID уже существует' }, { status: 400 })
    }

    const created = await createExhibitFromFlat(exhibit, exhibitId)
    return NextResponse.json({ success: true, exhibit: created }, { status: 201 })
  } catch (error) {
    console.error('Ошибка при создании экспоната:', error)
    return NextResponse.json({ error: 'Ошибка при создании экспоната' }, { status: 500 })
  }
}
