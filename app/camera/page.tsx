'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CameraPage() {
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [cameraSupported, setCameraSupported] = useState<boolean | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Проверяем права доступа - только для super-admin
  useEffect(() => {
    setIsMounted(true)
    const auth = localStorage.getItem('admin_auth')
    const role = localStorage.getItem('admin_role')
    
    if (auth === 'true' && role === 'super') {
      setHasAccess(true)
      setLoading(false)
    } else {
      // Если не супер-администратор, перенаправляем на главную
      router.push('/')
    }
  }, [router])

  useEffect(() => {
    return () => {
      // Очистка при размонтировании
      stopScanning()
    }
  }, [])

  const startScanning = async () => {
    try {
      setError(null)
      
      if (!videoRef.current) {
        setError('Элемент видео не найден')
        return
      }

      // Запрашиваем доступ к камере напрямую - это вызовет стандартное окно браузера
      // Не проверяем заранее, просто пробуем запросить доступ
      const constraints = {
        video: {
          facingMode: 'environment', // Задняя камера
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      }

      // Просто пробуем вызвать getUserMedia - не проверяем заранее
      // На мобильных устройствах проверки могут быть ненадежными
      let stream: MediaStream
      
      // Пробуем вызвать getUserMedia напрямую
      try {
        // Пробуем современный API
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (firstError: any) {
        // Если это ошибка из-за того, что API недоступен (TypeError), пробуем старые API
        const isUnsupportedError = firstError.name === 'TypeError' || 
                                   firstError.message?.includes('getUserMedia is not a function') || 
                                   firstError.message?.includes('Cannot read property') ||
                                   firstError.message?.includes('Cannot read properties') ||
                                   !navigator.mediaDevices
        
        if (isUnsupportedError) {
          // Пробуем старые API
          const legacyGetUserMedia = (navigator as any).getUserMedia || 
                                    (window as any).webkitGetUserMedia || 
                                    (window as any).mozGetUserMedia
          
          if (legacyGetUserMedia) {
            try {
              stream = await new Promise<MediaStream>((resolve, reject) => {
                const context = legacyGetUserMedia === (navigator as any).getUserMedia ? navigator : window
                legacyGetUserMedia.call(context, constraints, resolve, reject)
              })
            } catch (legacyError: any) {
              // Если и старые API не работают, значит браузер не поддерживает
              throw new Error('Ваш браузер не поддерживает доступ к камере. Пожалуйста, используйте современный браузер (Chrome, Firefox, Safari, Edge).')
            }
          } else {
            // Если ничего не найдено, значит браузер не поддерживает
            throw new Error('Ваш браузер не поддерживает доступ к камере. Пожалуйста, используйте современный браузер (Chrome, Firefox, Safari, Edge).')
          }
        } else {
          // Если это не ошибка "не поддерживается", пробрасываем дальше (это может быть ошибка разрешения и т.д.)
          throw firstError
        }
      }

      streamRef.current = stream

      // Подключаем поток к video элементу
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setIsScanning(true)
      setHasPermission(true)

      // Запускаем сканирование QR-кодов
      startQRScanning()
    } catch (err: any) {
      console.error('Ошибка при запуске камеры:', err)
      
      // Останавливаем поток, если он был создан
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
        streamRef.current = null
      }
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Доступ к камере запрещен. Пожалуйста, разрешите доступ к камере в настройках браузера.')
        setHasPermission(false)
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('Камера не найдена. Убедитесь, что камера подключена и доступна.')
        setHasPermission(false)
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Камера уже используется другим приложением. Закройте другие приложения, использующие камеру.')
        setHasPermission(false)
      } else {
        const errorDetails = err.message || err.toString() || 'Неизвестная ошибка'
        const errorName = err.name || 'UnknownError'
        console.error('Детали ошибки:', {
          name: errorName,
          message: errorDetails,
          stack: err.stack,
          fullError: err
        })
        
        setError(`Ошибка: ${errorDetails} (${errorName}). Если проблема сохраняется, проверьте настройки браузера и разрешите доступ к камере.`)
        setHasPermission(false)
      }
      
      setIsScanning(false)
    }
  }

  const startQRScanning = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

      // Загружаем библиотеку jsQR
      // @ts-ignore - библиотека может не иметь типов
      const jsqrModule = await import('jsqr')
      const jsQR = jsqrModule.default || jsqrModule
      
      if (!jsQR || typeof jsQR !== 'function') {
        console.error('jsQR не найден или не является функцией:', jsqrModule)
        setError('Не удалось загрузить библиотеку распознавания QR-кодов')
        stopScanning()
        return
      }

    const scan = () => {
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(scan)
        return
      }

      // Устанавливаем размеры canvas равными размерам video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Рисуем кадр на canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Получаем данные изображения
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Ищем QR-код
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code) {
        // QR-код найден!
        handleQRCodeDetected(code.data)
      } else {
        // Продолжаем сканирование
        animationFrameRef.current = requestAnimationFrame(scan)
      }
    }

    // Запускаем сканирование
    animationFrameRef.current = requestAnimationFrame(scan)
  }

  const stopScanning = async () => {
    try {
      // Останавливаем анимацию сканирования
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      // Останавливаем видеопоток
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
        streamRef.current = null
      }

      // Останавливаем видео
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.srcObject = null
      }

      setIsScanning(false)
    } catch (err) {
      console.error('Ошибка при остановке камеры:', err)
    }
  }

  const handleQRCodeDetected = (decodedText: string) => {
    // Останавливаем сканирование
    stopScanning()

    // Проверяем, что это URL экспоната
    try {
      const url = new URL(decodedText)
      const path = url.pathname
      
      // Проверяем формат /exhibit/[id]
      const exhibitMatch = path.match(/^\/exhibit\/(.+)$/)
      
      if (exhibitMatch) {
        const exhibitId = exhibitMatch[1]
        // Переходим на страницу экспоната
        router.push(`/exhibit/${exhibitId}`)
      } else {
        // Если это просто относительный путь
        if (decodedText.startsWith('/exhibit/')) {
          router.push(decodedText)
        } else {
          setError('Распознан QR-код, но это не ссылка на экспонат')
          setTimeout(() => {
            startScanning()
          }, 2000)
        }
      }
    } catch (e) {
      // Если это не URL, проверяем относительный путь
      if (decodedText.startsWith('/exhibit/')) {
        router.push(decodedText)
      } else {
        setError('Распознан QR-код, но это не ссылка на экспонат')
        setTimeout(() => {
          startScanning()
        }, 2000)
      }
    }
  }

  // Если нет доступа или идет проверка, показываем загрузку (или ничего, пока идет редирект)
  if (loading || !hasAccess) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">Сканер QR-кодов</h1>
        <p className="text-gray-600 mb-6">
          Наведите камеру на QR-код экспоната для быстрого перехода к его странице
        </p>

        {/* Область для видео */}
        <div className="mb-6">
          <div className="w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden relative" style={{ minHeight: '300px' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ display: isScanning ? 'block' : 'none' }}
            />
            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm opacity-75">Камера не запущена</p>
                </div>
              </div>
            )}
            {/* Невидимый canvas для обработки кадров */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>

        {/* Сообщения об ошибках */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Кнопки управления */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!isScanning ? (
            <button
              onClick={startScanning}
              disabled={isScanning}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Запустить сканер
            </button>
          ) : (
            <button
              onClick={stopScanning}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
              Остановить сканер
            </button>
          )}
        </div>

        {/* Инструкции */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Как использовать:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Нажмите кнопку "Запустить сканер"</li>
            <li>Разрешите доступ к камере, если браузер попросит</li>
            <li>Наведите камеру на QR-код экспоната</li>
            <li>Переход на страницу экспоната произойдет автоматически</li>
          </ol>
        </div>

        {/* Информация о разрешениях */}
        {hasPermission === false && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm mb-2">
              <strong>Нет доступа к камере.</strong> Пожалуйста, проверьте настройки браузера и разрешите доступ к камере для этого сайта.
            </p>
            <p className="text-yellow-700 text-xs">
              <strong>Как разрешить доступ:</strong>
            </p>
            <ul className="text-yellow-700 text-xs list-disc list-inside mt-1 space-y-1">
              <li><strong>Chrome (Android):</strong> Настройки → Сайты → Камера → Разрешить</li>
              <li><strong>Safari (iOS):</strong> Настройки → Safari → Камера → Разрешить</li>
              <li>Или нажмите на иконку замка в адресной строке и разрешите доступ к камере</li>
            </ul>
          </div>
        )}

        {/* Информация о HTTP/HTTPS */}
        {isMounted && typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Примечание:</strong> Некоторые браузеры могут требовать HTTPS для доступа к камере. 
              Если сканер не работает, попробуйте открыть сайт через HTTPS или используйте localhost.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
