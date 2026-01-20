'use client'

import React, { Suspense, useMemo, useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface ModelThumbnailProps {
  modelPath: string
  className?: string
}

const thumbnailCache = new Map<string, string>()

function ContextCleanup() {
  const { gl } = useThree()
  
  useEffect(() => {
    return () => {
      try {
        const canvas = gl.domElement
        if (canvas) {
          const context = canvas.getContext('webgl') || canvas.getContext('webgl2')
          if (context) {
            try {
              const loseContext = context.getExtension('WEBGL_lose_context')
              if (loseContext && typeof loseContext.loseContext === 'function') {
                loseContext.loseContext()
              }
            } catch (e) {
              // Игнорируем ошибки при потере контекста
            }
          }
        }
        gl.dispose()
      } catch (e) {
        // Игнорируем ошибки очистки
      }
    }
  }, [gl])
  
  return null
}

function ModelPreview({ modelPath }: { modelPath: string }) {
  let scene: THREE.Group | null = null
  
  try {
    const gltf = useGLTF(modelPath) as { scene: THREE.Group }
    scene = gltf.scene
  } catch (error) {
    console.warn('Ошибка загрузки модели:', modelPath, error)
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
    )
  }

  const processedScene = useMemo(() => {
    if (!scene) return null

    try {
      const cloned = scene.clone()
      
      const box = new THREE.Box3().setFromObject(cloned)
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      
      const TARGET_MAX_SIZE = 3.0
      
      const scale = maxDim > 0 ? TARGET_MAX_SIZE / maxDim : 1
      cloned.scale.set(scale, scale, scale)
      
      const scaledBox = new THREE.Box3().setFromObject(cloned)
      const scaledCenter = scaledBox.getCenter(new THREE.Vector3())
      
      cloned.position.x = -scaledCenter.x
      cloned.position.y = -scaledCenter.y
      cloned.position.z = -scaledCenter.z

      return cloned
    } catch (error) {
      console.warn('Ошибка обработки модели:', error)
      return null
    }
  }, [scene])

  if (!processedScene) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
    )
  }

  return <primitive object={processedScene} />
}

class ModelThumbnailErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode; modelPath: string },
  { hasError: boolean; retryCount: number }
> {
  private retryTimeout?: NodeJS.Timeout

  constructor(props: { children: React.ReactNode; fallback: React.ReactNode; modelPath: string }) {
    super(props)
    this.state = { hasError: false, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error, prevState: { hasError: boolean; retryCount: number }) {
    return { hasError: true, retryCount: prevState.retryCount }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('Ошибка загрузки миниатюры модели:', this.props.modelPath, error.message)
    
    if (this.state.retryCount < 2) {
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout)
      }
      this.retryTimeout = setTimeout(() => {
        this.setState({ hasError: false, retryCount: this.state.retryCount + 1 })
      }, 1000 * (this.state.retryCount + 1))
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
  }

  render() {
    if (this.state.hasError && this.state.retryCount >= 2) {
      return this.props.fallback
    }
    return this.props.children
  }
}


let activeContexts = 0
const MAX_ACTIVE_CONTEXTS = 10

export default function ModelThumbnail({ modelPath, className }: ModelThumbnailProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [canRender, setCanRender] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let isMounted = true

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!isMounted) return
          
          if (entry.isIntersecting) {
            setIsVisible(true)
            if (activeContexts < MAX_ACTIVE_CONTEXTS) {
              if (renderTimeoutRef.current) {
                clearTimeout(renderTimeoutRef.current)
              }
              renderTimeoutRef.current = setTimeout(() => {
                if (isMounted) {
                  setCanRender(true)
                  activeContexts++
                }
              }, 100)
            }
            observer.disconnect()
          } else if (!entry.isIntersecting && canRender) {
            setCanRender(false)
            activeContexts = Math.max(0, activeContexts - 1)
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
      isMounted = false
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current)
      }
      observer.disconnect()
      if (canRender) {
        activeContexts = Math.max(0, activeContexts - 1)
        setCanRender(false)
      }
    }
  }, [canRender])

  useEffect(() => {
    if (!canRender && isVisible && retryCount < 3) {
      const timeout = setTimeout(() => {
        if (activeContexts < MAX_ACTIVE_CONTEXTS) {
          setCanRender(true)
          activeContexts++
          setRetryCount(prev => prev + 1)
        }
      }, 2000 * (retryCount + 1))
      
      return () => clearTimeout(timeout)
    }
  }, [canRender, isVisible, retryCount])

  const fallback = (
    <div className={`relative w-full h-full bg-gray-100 flex items-center justify-center ${className || ''}`}>
      <div className="text-gray-400 text-xs">3D</div>
    </div>
  )

  if (!isVisible || !canRender) {
    return (
      <div ref={containerRef} className={`relative w-full h-full bg-gray-100 flex items-center justify-center ${className || ''}`}>
        <div className="text-gray-400 text-xs">3D</div>
      </div>
    )
  }

  return (
    <ModelThumbnailErrorBoundary fallback={fallback} modelPath={modelPath}>
      <div ref={containerRef} className={`relative w-full h-full bg-gray-100 ${className || ''}`}>
        <Canvas
          key={`canvas-${modelPath}-${retryCount}`}
          gl={{ 
            antialias: false, 
            alpha: true,
            powerPreference: 'low-power',
            preserveDrawingBuffer: false,
            failIfMajorPerformanceCaveat: false,
          }}
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 1.5]}
          frameloop="demand"
          onCreated={({ gl }) => {
            try {
              gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
            } catch (e) {
              console.warn('Ошибка установки pixel ratio:', e)
            }
          }}
          onError={(error) => {
            console.warn('Ошибка Canvas:', modelPath, error)
            if (retryCount < 2) {
              setTimeout(() => {
                setRetryCount(prev => prev + 1)
                setCanRender(false)
                activeContexts = Math.max(0, activeContexts - 1)
              }, 1000)
            }
          }}
        >
          <ContextCleanup />
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={0.8} />
          <directionalLight position={[-10, 5, -5]} intensity={0.4} />
          <Environment preset="city" />
          
          <Suspense
            fallback={
              <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#d1d5db" />
              </mesh>
            }
          >
            <ModelPreview modelPath={modelPath} />
          </Suspense>
          
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={1}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.5}
          />
          <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
        </Canvas>
      </div>
    </ModelThumbnailErrorBoundary>
  )
}
