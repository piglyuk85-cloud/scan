'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeDisplayProps {
  exhibitId: string
}

export default function QRCodeDisplay({ exhibitId }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    const generateQR = async () => {
      if (canvasRef.current) {
        try {
          // Генерируем URL для локальной разработки
          const url =
            typeof window !== 'undefined'
              ? `${window.location.origin}/exhibit/${exhibitId}`
              : `http://localhost:3000/exhibit/${exhibitId}`

          // Генерируем QR-код
          const dataUrl = await QRCode.toDataURL(url, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
            errorCorrectionLevel: 'H',
          })

          setQrDataUrl(dataUrl)

          // Также рисуем на canvas для возможности скачивания
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d')
            if (ctx) {
              const img = new Image()
              img.onload = () => {
                ctx.clearRect(0, 0, 300, 300)
                ctx.drawImage(img, 0, 0)
              }
              img.src = dataUrl
            }
          }
        } catch (error) {
          console.error('Ошибка генерации QR-кода:', error)
        }
      }
    }

    generateQR()
  }, [exhibitId])

  const downloadQR = () => {
    if (qrDataUrl) {
      const link = document.createElement('a')
      link.download = `qr-code-${exhibitId}.png`
      link.href = qrDataUrl
      link.click()
    }
  }

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={300} height={300} className="hidden" />
      {qrDataUrl ? (
        <>
          <img
            src={qrDataUrl}
            alt="QR код"
            className="w-full max-w-[300px] h-auto border-4 border-white shadow-lg rounded-lg"
          />
          <button
            onClick={downloadQR}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-semibold"
          >
            Скачать QR-код
          </button>
        </>
      ) : (
        <div className="w-full max-w-[300px] aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
          <div className="text-gray-400">Загрузка QR-кода...</div>
        </div>
      )}
    </div>
  )
}


