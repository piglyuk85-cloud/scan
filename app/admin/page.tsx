'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Exhibit } from '@/types/exhibit'
import ExhibitForm from '@/components/admin/ExhibitForm'
import ExhibitList from '@/components/admin/ExhibitList'
import PageContentEditor from '@/components/admin/PageContentEditor'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [userRole, setUserRole] = useState<'admin' | 'super' | null>(null)
  const [exhibits, setExhibits] = useState<Exhibit[]>([])
  const [loading, setLoading] = useState(true)
  const [editingExhibit, setEditingExhibit] = useState<Exhibit | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [activeSection, setActiveSection] = useState<'exhibits' | 'content'>('exhibits')

  const ADMIN_CREDENTIALS = {
    admin: { password: 'adminvsu2025', role: 'admin' },
    super: { password: '12281992', role: 'super' },
  } as const

  useEffect(() => {
    // Проверяем, авторизован ли пользователь
    const auth = localStorage.getItem('admin_auth')
    const role = localStorage.getItem('admin_role') as 'admin' | 'super' | null
    if (auth === 'true' && role) {
      setIsAuthenticated(true)
      setUserRole(role)
      loadExhibits()
    } else {
      setLoading(false)
    }

    // Проверяем параметр edit в URL
    const urlParams = new URLSearchParams(window.location.search)
    const editId = urlParams.get('edit')
    if (editId && auth === 'true') {
      // Загружаем экспонат для редактирования
      const role = localStorage.getItem('admin_role')
      fetch(`/api/exhibits/${editId}`, {
        headers: {
          'x-admin-auth': 'true',
          'x-admin-role': role || 'admin',
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.id) {
            setEditingExhibit(data)
            setShowForm(true)
            setActiveSection('exhibits')
            // Очищаем параметр из URL
            window.history.replaceState({}, '', '/admin')
          }
        })
        .catch((err) => console.error('Ошибка загрузки экспоната:', err))
    }

    // Если обычный админ попал на недоступный раздел, переключаем на экспонаты
    if (auth === 'true' && role === 'admin') {
      if (activeSection === 'content') {
        setActiveSection('exhibits')
      }
    }
  }, [activeSection])

  const loadExhibits = async () => {
    try {
      // В админ-панели загружаем все экспонаты, включая приватные
      const role = localStorage.getItem('admin_role')
      const response = await fetch('/api/exhibits', {
        headers: {
          'x-admin-auth': 'true',
          'x-admin-role': role || 'admin',
        },
      })
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const credentials = ADMIN_CREDENTIALS[username as keyof typeof ADMIN_CREDENTIALS]
    
    if (credentials && credentials.password === password) {
      setIsAuthenticated(true)
      setUserRole(credentials.role)
      localStorage.setItem('admin_auth', 'true')
      localStorage.setItem('admin_role', credentials.role)
      // Устанавливаем cookie для серверной проверки
      document.cookie = `admin_auth=true; path=/; max-age=86400` // 24 часа
      document.cookie = `admin_role=${credentials.role}; path=/; max-age=86400` // 24 часа
      loadExhibits()
    } else {
      alert('Неверный логин или пароль')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUserRole(null)
    localStorage.removeItem('admin_auth')
    localStorage.removeItem('admin_role')
    // Удаляем cookie
    document.cookie = 'admin_auth=; path=/; max-age=0'
    document.cookie = 'admin_role=; path=/; max-age=0'
    setUsername('')
    setPassword('')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту работу?')) {
      return
    }

    try {
      const role = localStorage.getItem('admin_role') || 'admin'
      const response = await fetch(`/api/exhibits/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-auth': 'true',
          'x-admin-role': role,
        },
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
                placeholder="Введите логин"
                required
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
              />
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
        {/* Контент страниц и Редактор галереи - только для супер-админа */}
        {userRole === 'super' && (
          <>
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
            <a
              href="/admin/gallery"
              className="px-6 py-3 font-medium text-gray-600 hover:text-gray-800 border-b-2 border-transparent hover:border-primary-600"
            >
              Редактор галереи
            </a>
          </>
        )}
      </div>

      {/* Контент разделов */}
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
                onClick={() => {
                  setEditingExhibit(null)
                  setShowForm(true)
                }}
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

      {/* Контент страниц - только для супер-админа */}
      {activeSection === 'content' && userRole === 'super' && (
        <PageContentEditor onSave={() => {
          // Перезагружаем страницу для обновления контента
          window.location.reload()
        }} />
      )}
    </div>
  )
}

