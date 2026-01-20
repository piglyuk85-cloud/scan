'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SiteSettings } from '@/types/pageContent'

export default function Footer() {
  const [settings, setSettings] = useState<SiteSettings | null>(null)

  useEffect(() => {
    fetch('/api/page-content')
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings) {
          setSettings(data.settings)
        }
      })
      .catch(() => {})
  }, [])

  if (!settings) {
    return (
      <footer className="bg-gray-800 text-white py-8 px-4 mt-auto">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center text-gray-400">Загрузка...</div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="bg-gray-800 text-white py-8 px-4 mt-auto">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">{settings.siteName}</h3>
            <p className="text-gray-400">{settings.footer.description}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{settings.footer.navigationTitle}</h4>
            <ul className="space-y-2 text-gray-400">
              {settings.footer.links.map((link, idx) => (
                <li key={idx}>
                  <Link href={link.href} className="hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{settings.footer.contactsTitle}</h4>
            <p className="text-gray-400 whitespace-pre-line">
              {settings.footer.contactsAddress}
            </p>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>{settings.footer.copyright}</p>
        </div>
      </div>
    </footer>
  )
}

