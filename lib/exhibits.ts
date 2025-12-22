import { Exhibit } from '@/types/exhibit'
import exhibitsData from '@/data/exhibits.json'

export function getExhibits(): Exhibit[] {
  return exhibitsData as Exhibit[]
}

export function getExhibitById(id: string): Exhibit | undefined {
  return getExhibits().find((exhibit) => exhibit.id === id)
}

export function getExhibitsByCategory(category: string): Exhibit[] {
  return getExhibits().filter((exhibit) => exhibit.category === category)
}

export function searchExhibits(query: string): Exhibit[] {
  const lowerQuery = query.toLowerCase()
  return getExhibits().filter(
    (exhibit) =>
      exhibit.title.toLowerCase().includes(lowerQuery) ||
      exhibit.description.toLowerCase().includes(lowerQuery) ||
      exhibit.category.toLowerCase().includes(lowerQuery) ||
      (exhibit.studentName && exhibit.studentName.toLowerCase().includes(lowerQuery))
  )
}

export function getCategories(): string[] {
  const categories = new Set(getExhibits().map((exhibit) => exhibit.category))
  return Array.from(categories).sort()
}

export function getYears(): string[] {
  const years = new Set(
    getExhibits()
      .map((exhibit) => exhibit.year)
      .filter((year): year is string => !!year)
  )
  return Array.from(years).sort()
}

