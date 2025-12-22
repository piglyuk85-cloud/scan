'use client'

import { useState, useRef, useEffect } from 'react'

interface MobileControlsProps {
  onMove: (direction: 'forward' | 'backward' | 'left' | 'right', active: boolean) => void
  onLook: (deltaX: number, deltaY: number) => void
}

export default function MobileControls({ onMove, onLook }: MobileControlsProps) {
  const [isTouchActive, setIsTouchActive] = useState(false)
  const [gyroEnabled, setGyroEnabled] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const lookTouchRef = useRef<{ x: number; y: number } | null>(null)
  const lastGyroRef = useRef<{ beta: number; gamma: number } | null>(null)

  // Определяем, мобильное ли устройство
  const isMobile = typeof window !== 'undefined' && 
    ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  // Поддержка гироскопа (опционально)
  useEffect(() => {
    if (!gyroEnabled || !isMobile) return

    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta !== null && event.gamma !== null) {
        if (lastGyroRef.current) {
          const deltaBeta = (event.beta - lastGyroRef.current.beta) * 2
          const deltaGamma = (event.gamma - lastGyroRef.current.gamma) * 2
          onLook(deltaGamma, deltaBeta)
        }
        lastGyroRef.current = { beta: event.beta, gamma: event.gamma }
      }
    }

    if (typeof DeviceOrientationEvent !== 'undefined') {
      // Запрос разрешения на доступ к гироскопу (iOS 13+)
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        ;(DeviceOrientationEvent as any).requestPermission()
          .then((response: string) => {
            if (response === 'granted') {
              window.addEventListener('deviceorientation', handleDeviceOrientation)
            }
          })
          .catch(() => {})
      } else {
        window.addEventListener('deviceorientation', handleDeviceOrientation)
      }
    }

    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation)
    }
  }, [gyroEnabled, isMobile, onLook])

  if (!isMobile) {
    return null
  }

  const handleTouchStart = (e: React.TouchEvent, direction: 'forward' | 'backward' | 'left' | 'right') => {
    e.preventDefault()
    setIsTouchActive(true)
    onMove(direction, true)
  }

  const handleTouchEnd = (e: React.TouchEvent, direction: 'forward' | 'backward' | 'left' | 'right') => {
    e.preventDefault()
    setIsTouchActive(false)
    onMove(direction, false)
  }

  // Обработка поворота камеры касанием (правая часть экрана)
  const handleLookTouchStart = (e: React.TouchEvent) => {
    // Проверяем, что касание в правой части экрана (для поворота камеры)
    const touch = e.touches[0]
    const screenWidth = window.innerWidth
    // Увеличиваем порог до 50%, чтобы левая часть точно была свободна для экспонатов
    if (touch.clientX > screenWidth * 0.5) {
      lookTouchRef.current = { x: touch.clientX, y: touch.clientY }
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const handleLookTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && lookTouchRef.current) {
      const touch = e.touches[0]
      const screenWidth = window.innerWidth
      // Проверяем, что движение все еще в правой части
      if (touch.clientX > screenWidth * 0.5) {
        const deltaX = touch.clientX - lookTouchRef.current.x
        const deltaY = touch.clientY - lookTouchRef.current.y
        
        // Увеличиваем чувствительность для мобильных
        onLook(deltaX * 1.5, deltaY * 1.5)
        
        lookTouchRef.current = { x: touch.clientX, y: touch.clientY }
        e.preventDefault()
        e.stopPropagation()
      } else {
        // Если палец ушел в левую часть, прекращаем поворот
        lookTouchRef.current = null
      }
    }
  }

  const handleLookTouchEnd = (e: React.TouchEvent) => {
    lookTouchRef.current = null
    // Не preventDefault, чтобы не блокировать другие события
  }

  return (
    <>
      {/* Виртуальный джойстик для поворота камеры (правая часть экрана) */}
      {/* Не перехватываем события в левой части, чтобы можно было взаимодействовать с экспонатами */}
      <div
        className="absolute top-0 right-0 bottom-0 z-10 touch-none pointer-events-auto"
        style={{ 
          width: '50%',
          left: '50%',
          touchAction: 'none'
        }}
        onTouchStart={handleLookTouchStart}
        onTouchMove={handleLookTouchMove}
        onTouchEnd={handleLookTouchEnd}
      />

      {/* Виртуальные кнопки управления - компактный дизайн */}
      <div className="absolute bottom-4 left-4 z-20">
        {/* Компактная сетка 3x3 */}
        <div className="grid grid-cols-3 gap-1.5">
          {/* Пустая ячейка */}
          <div></div>
          {/* Вперед */}
          <button
            onTouchStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTouchStart(e, 'forward')
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTouchEnd(e, 'forward')
            }}
            onTouchCancel={(e) => {
              e.preventDefault()
              handleTouchEnd(e, 'forward')
            }}
            onMouseDown={() => onMove('forward', true)}
            onMouseUp={() => onMove('forward', false)}
            onMouseLeave={() => onMove('forward', false)}
            className="w-12 h-12 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center text-gray-800 font-bold text-lg active:bg-primary-100 active:scale-95 transition-all touch-none select-none border border-gray-300"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            ↑
          </button>
          {/* Пустая ячейка */}
          <div></div>
          
          {/* Влево */}
          <button
            onTouchStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTouchStart(e, 'left')
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTouchEnd(e, 'left')
            }}
            onTouchCancel={(e) => {
              e.preventDefault()
              handleTouchEnd(e, 'left')
            }}
            onMouseDown={() => onMove('left', true)}
            onMouseUp={() => onMove('left', false)}
            onMouseLeave={() => onMove('left', false)}
            className="w-12 h-12 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center text-gray-800 font-bold text-lg active:bg-primary-100 active:scale-95 transition-all touch-none select-none border border-gray-300"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            ←
          </button>
          {/* Центральная кнопка (можно использовать для паузы или меню) */}
          <div className="w-12 h-12"></div>
          {/* Вправо */}
          <button
            onTouchStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTouchStart(e, 'right')
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTouchEnd(e, 'right')
            }}
            onTouchCancel={(e) => {
              e.preventDefault()
              handleTouchEnd(e, 'right')
            }}
            onMouseDown={() => onMove('right', true)}
            onMouseUp={() => onMove('right', false)}
            onMouseLeave={() => onMove('right', false)}
            className="w-12 h-12 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center text-gray-800 font-bold text-lg active:bg-primary-100 active:scale-95 transition-all touch-none select-none border border-gray-300"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            →
          </button>
          
          {/* Пустая ячейка */}
          <div></div>
          {/* Назад */}
          <button
            onTouchStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTouchStart(e, 'backward')
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTouchEnd(e, 'backward')
            }}
            onTouchCancel={(e) => {
              e.preventDefault()
              handleTouchEnd(e, 'backward')
            }}
            onMouseDown={() => onMove('backward', true)}
            onMouseUp={() => onMove('backward', false)}
            onMouseLeave={() => onMove('backward', false)}
            className="w-12 h-12 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center text-gray-800 font-bold text-lg active:bg-primary-100 active:scale-95 transition-all touch-none select-none border border-gray-300"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            ↓
          </button>
          {/* Пустая ячейка */}
          <div></div>
        </div>
      </div>

      {/* Кнопка включения гироскопа */}
      <div className="absolute top-4 right-4 z-20 md:hidden">
        <button
          onClick={() => setGyroEnabled(!gyroEnabled)}
          className={`px-3 py-2 text-xs rounded-lg shadow-lg font-medium transition-colors ${
            gyroEnabled 
              ? 'bg-primary-600 text-white' 
              : 'bg-white/90 backdrop-blur-sm text-gray-700 border border-gray-300'
          }`}
        >
          {gyroEnabled ? 'Гироскоп: Вкл' : 'Гироскоп: Выкл'}
        </button>
      </div>
    </>
  )
}

