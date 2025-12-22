'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Exhibit } from '@/types/exhibit'
import ExhibitForm from '@/components/admin/ExhibitForm'
import ExhibitList from '@/components/admin/ExhibitList'
import PageContentEditor from '@/components/admin/PageContentEditor'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [exhibits, setExhibits] = useState<Exhibit[]>([])
  const [loading, setLoading] = useState(true)
  const [editingExhibit, setEditingExhibit] = useState<Exhibit | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [activeSection, setActiveSection] = useState<'exhibits' | 'content'>('exhibits')

  // Простая аутентификация (для локальной разработки)
  // В продакшене используйте более безопасные методы
  const ADMIN_PASSWORD = 'admin123'

  useEffect(() => {
    // Проверяем, авторизован ли пользователь
    const auth = localStorage.getItem('admin_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
      loadExhibits()
    } else {
      setLoading(false)
    }
  }, [])

  const loadExhibits = async () => {
    try {
      const response = await fetch('/api/exhibits')
      if (response.ok) {
        const data = await response.json()
        setExhibits(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки экспонатов:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      localStorage.setItem('admin_auth', 'true')
      loadExhibits()
    } else {
      alert('Неверный пароль')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('admin_auth')
    setPassword('')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту работу?')) {
      return
    }

    try {
      const response = await fetch(`/api/exhibits/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadExhibits()
        alert('Работа удалена')
      } else {
        alert('Ошибка при удалении работы')
      }
    } catch (error) {
      console.error('Ошибка удаления:', error)
      alert('Ошибка при удалении экспоната')
    }
  }

  const handleEdit = (exhibit: Exhibit) => {
    setEditingExhibit(exhibit)
    setShowForm(true)
  }

  const handleFormSubmit = () => {
    setEditingExhibit(null)
    setShowForm(false)
    loadExhibits()
  }

  const handleCancel = () => {
    setEditingExhibit(null)
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="text-center">Загрузка...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-md px-4 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold mb-2 text-center text-gray-800">
              Админ-панель
            </h1>
            <p className="text-sm text-gray-600 text-center mb-6">
              Виртуальная галерея ВГУ имени П.М. Машерова
            </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Пароль
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Введите пароль"
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                Пароль по умолчанию: <code>admin123</code>
              </p>
            </div>
            <button
              type="submit"
              className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Войти
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Админ-панель</h1>
        <div className="flex gap-4">
          <button
            onClick={handleLogout}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Выйти
          </button>
        </div>
      </div>

      {/* Навигация между разделами */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => {
            setActiveSection('exhibits')
            setShowForm(false)
          }}
          className={`px-6 py-3 font-medium ${
            activeSection === 'exhibits'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Экспонаты
        </button>
        <button
          onClick={() => {
            setActiveSection('content')
            setShowForm(false)
          }}
          className={`px-6 py-3 font-medium ${
            activeSection === 'content'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Контент страниц
        </button>
      </div>

      {/* Контент разделов */}
      {activeSection === 'exhibits' && (
        <>
          {!showForm ? (
            <div className="mb-4">
              <button
                onClick={() => setShowForm(true)}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
              >
                + Добавить работу
              </button>
            </div>
          ) : (
            <ExhibitForm
              exhibit={editingExhibit}
              onSubmit={handleFormSubmit}
              onCancel={handleCancel}
            />
          )}
          {!showForm && (
            <ExhibitList
              exhibits={exhibits}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRefresh={loadExhibits}
            />
          )}
        </>
      )}

      {activeSection === 'content' && (
        <PageContentEditor onSave={() => {}} />
      )}
    </div>
  )
}

