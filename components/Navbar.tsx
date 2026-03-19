'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [siteName, setSiteName] = useState('ВГУ Галерея')
  const [isAdmin, setIsAdmin] = useState(false)

  // Роль определяем через API (сессия в HttpOnly cookie)
  useEffect(() => {
    if (typeof window === 'undefined') return
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setIsAdmin(data.role === 'super' || data.role === 'admin')
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/page-content')
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings?.siteName) {
          setSiteName(data.settings.siteName)
        }
      })
      .catch(() => {})
  }, [])

  const [navLinks, setNavLinks] = useState([
    { href: '/', label: 'Главная' },
    { href: '/catalog', label: 'Каталог' },
    { href: '/gallery', label: 'Виртуальная галерея' },
    { href: '/camera', label: 'Камера' },
  ])

  useEffect(() => {
    fetch('/api/page-content')
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings?.siteName) {
          setSiteName(data.settings.siteName)
        }
        if (data?.settings?.navigation) {
          const links = [
            { href: '/', label: data.settings.navigation.home },
            { href: '/catalog', label: data.settings.navigation.catalog },
            { href: '/gallery', label: data.settings.navigation.virtualGallery },
            { href: '/camera', label: data.settings.navigation.camera || 'Камера' },
          ]
          
          // Руководство и "О галерее" доступны только администраторам
          if (isAdmin) {
            links.push({ href: '/about', label: data.settings.navigation.about })
            links.push({ href: '/user-guide', label: 'Руководство' })
          }
          
          setNavLinks(links)
        }
      })
      .catch(() => {})
  }, [isAdmin])

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            {siteName}
          </Link>

          {/* Desktop menu */}
          <div className="hidden md:flex gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === link.href
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                }`}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}

