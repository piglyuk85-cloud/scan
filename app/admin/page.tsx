'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Exhibit } from '@/types/exhibit'
import ExhibitForm from '@/components/admin/ExhibitForm'
import ExhibitList from '@/components/admin/ExhibitList'
import PageContentEditor from '@/components/admin/PageContentEditor'
import GuideEditor from '@/components/admin/GuideEditor'

type AdminRole = 'admin' | 'super'

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [userRole, setUserRole] = useState<AdminRole | null>(null)
  const [exhibits, setExhibits] = useState<Exhibit[]>([])
  const [loading, setLoading] = useState(true)
  const [editingExhibit, setEditingExhibit] = useState<Exhibit | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [activeSection, setActiveSection] = useState<'exhibits' | 'content' | 'guide'>('exhibits')
  const [loginError, setLoginError] = useState('')

  // Проверка сессии при загрузке (HttpOnly cookie проверяется на сервере)
  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.role) {
          setIsAuthenticated(true)
          setUserRole(data.role)
          loadExhibits()
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Параметр ?edit=id в URL — открыть форму редактирования после проверки сессии
  useEffect(() => {
    if (!isAuthenticated || !userRole) return
    const params = new URLSearchParams(window.location.search)
    const editId = params.get('edit')
    if (!editId) return
    fetch(`/api/exhibits/${editId}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          setEditingExhibit(data)
          setShowForm(true)
          setActiveSection('exhibits')
          window.history.replaceState({}, '', '/admin')
        }
      })
      .catch((err) => console.error('Ошибка загрузки экспоната:', err))
  }, [isAuthenticated, userRole])

  // Для обычного админа скрыть разделы content/guide
  useEffect(() => {
    if (userRole === 'admin' && (activeSection === 'content' || activeSection === 'guide')) {
      setActiveSection('exhibits')
    }
  }, [userRole, activeSection])

  const loadExhibits = async () => {
    try {
      const response = await fetch('/api/exhibits', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setExhibits(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки экспонатов:', error)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
      credentials: 'include',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setLoginError(data.error || 'Ошибка входа')
      return
    }
    setIsAuthenticated(true)
    setUserRole(data.role)
    setUsername('')
    setPassword('')
    loadExhibits()
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setIsAuthenticated(false)
    setUserRole(null)
    setUsername('')
    setPassword('')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту работу?')) return
    try {
      const response = await fetch(`/api/exhibits/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (response.ok) {
        loadExhibits()
        alert('Работа удалена')
      } else {
        const error = await response.json()
        alert(error.error || 'Ошибка при удалении работы')
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
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Логин
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="admin или super"
                required
                autoComplete="username"
              />
            </div>
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
                autoComplete="current-password"
              />
            </div>
            {loginError && (
              <p className="text-sm text-red-600">{loginError}</p>
            )}
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

      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => { setActiveSection('exhibits'); setShowForm(false) }}
          className={`px-6 py-3 font-medium ${
            activeSection === 'exhibits'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Экспонаты
        </button>
        {userRole === 'super' && (
          <>
            <button
              onClick={() => { setActiveSection('content'); setShowForm(false) }}
              className={`px-6 py-3 font-medium ${
                activeSection === 'content'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Контент страниц
            </button>
            <button
              onClick={() => { setActiveSection('guide'); setShowForm(false) }}
              className={`px-6 py-3 font-medium ${
                activeSection === 'guide'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Руководство пользователя
            </button>
            <a
              href="/admin/gallery"
              className="px-6 py-3 font-medium text-gray-600 hover:text-gray-800 border-b-2 border-transparent hover:border-primary-600"
            >
              Редактор галереи
            </a>
          </>
        )}
      </div>

      {activeSection === 'exhibits' && (
        <>
          {!showForm ? (
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Управление экспонатами
                </h2>
                <p className="text-gray-600 text-sm">
                  Здесь вы можете добавлять, редактировать и удалять экспонаты
                </p>
              </div>
              <button
                onClick={() => { setEditingExhibit(null); setShowForm(true) }}
                className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Добавить работу
              </button>
            </div>
          ) : (
            <div className="mb-6">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-blue-700 font-medium">
                    {editingExhibit ? 'Редактирование экспоната' : 'Создание нового экспоната'}
                  </p>
                </div>
              </div>
              <ExhibitForm
                exhibit={editingExhibit}
                onSubmit={handleFormSubmit}
                onCancel={handleCancel}
                userRole={userRole}
              />
            </div>
          )}
          {!showForm && (
            <ExhibitList
              exhibits={exhibits}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRefresh={loadExhibits}
              userRole={userRole}
            />
          )}
        </>
      )}

      {activeSection === 'content' && userRole === 'super' && (
        <PageContentEditor onSave={() => window.location.reload()} />
      )}

      {activeSection === 'guide' && userRole === 'super' && (
        <GuideEditor />
      )}
    </div>
  )
}
