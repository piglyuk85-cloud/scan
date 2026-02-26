'use client'

import React, { Suspense, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import * as THREE from 'three'

// Динамический импорт 3D сцены с отключением SSR
const ThumbnailScene = dynamic(() => import('./ThumbnailScene'), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="text-gray-400 text-xs">3D</div>
    </div>
  ),
})

interface ModelThumbnailProps {
  modelPath: string
  className?: string
}

class ModelThumbnailErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.warn('Ошибка загрузки миниатюры модели:', error.message)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

export default function ModelThumbnailClient({ modelPath, className }: ModelThumbnailProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isWebGLSupported, setIsWebGLSupported] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const webglContextRef = useRef<WebGLRenderingContext | WebGL2RenderingContext | null>(null)

  // Проверка поддержки WebGL
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsWebGLSupported(false)
      return
    }

    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        if (gl && typeof THREE !== 'undefined' && THREE.Scene && THREE.WebGLRenderer) {
          setIsWebGLSupported(true)
        } else {
          setIsWebGLSupported(false)
        }
      } catch (e) {
        setIsWebGLSupported(false)
      }
    }
    
    checkWebGL()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !isWebGLSupported) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '100px',
        threshold: 0.01,
      }
    )

    observer.observe(container)

    return () => {
      observer.disconnect()
      setIsVisible(false)
      if (webglContextRef.current) {
        try {
          const loseContext = (webglContextRef.current as any).getExtension?.('WEBGL_lose_context')
          if (loseContext && loseContext.loseContext) {
            loseContext.loseContext()
          }
        } catch {
          // ok
        }
        webglContextRef.current = null
      }
    }
  }, [isWebGLSupported])

  const fallback = (
    <div className={`relative w-full h-full bg-gray-100 flex items-center justify-center ${className || ''}`}>
      <div className="text-gray-400 text-xs">3D</div>
    </div>
  )

  if (!isWebGLSupported || !isVisible) {
    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full bg-gray-100 flex items-center justify-center ${className || ''}`}
      >
        <div className="text-gray-400 text-xs">3D</div>
      </div>
    )
  }

  // Дополнительная проверка перед рендерингом Canvas
  if (typeof window === 'undefined' || !THREE || !THREE.Scene || !THREE.WebGLRenderer) {
    return fallback
  }

  return (
    <ModelThumbnailErrorBoundary fallback={fallback}>
      <div ref={containerRef} className={`relative w-full h-full bg-gray-100 ${className || ''}`}>
        <Suspense fallback={fallback}>
          <ThumbnailScene
            modelPath={modelPath}
            onCreated={({ gl }: { gl: any }) => {
              try {
                webglContextRef.current = gl.getContext() as
                  | WebGLRenderingContext
                  | WebGL2RenderingContext
              } catch (e) {
                console.warn('Failed to get WebGL context:', e)
              }
            }}
          />
        </Suspense>
      </div>
    </ModelThumbnailErrorBoundary>
  )
}
