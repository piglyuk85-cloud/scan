'use client'

import React, { Suspense, useMemo, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Функция для очистки ресурсов Three.js из сцены
function disposeScene(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry) {
        child.geometry.dispose()
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            if (mat.map) mat.map.dispose()
            if (mat.normalMap) mat.normalMap.dispose()
            if (mat.roughnessMap) mat.roughnessMap.dispose()
            if (mat.metalnessMap) mat.metalnessMap.dispose()
            if (mat.emissiveMap) mat.emissiveMap.dispose()
            if (mat.aoMap) mat.aoMap.dispose()
            mat.dispose()
          })
        } else {
          if (child.material.map) child.material.map.dispose()
          if (child.material.normalMap) child.material.normalMap.dispose()
          if (child.material.roughnessMap) child.material.roughnessMap.dispose()
          if (child.material.metalnessMap) child.material.metalnessMap.dispose()
          if (child.material.emissiveMap) child.material.emissiveMap.dispose()
          if (child.material.aoMap) child.material.aoMap.dispose()
          child.material.dispose()
        }
      }
    }
  })
}

interface ModelThumbnailProps {
  modelPath: string
  className?: string
}

function ModelPreview({ modelPath }: { modelPath: string }) {
  const { scene } = useGLTF(modelPath) as { scene: THREE.Group }
  const processedSceneRef = useRef<THREE.Group | null>(null)

  const processedScene = useMemo(() => {
    // Освобождаем предыдущую сцену перед созданием новой
    if (processedSceneRef.current) {
      disposeScene(processedSceneRef.current)
      processedSceneRef.current = null
    }

    if (!scene) return null

    const cloned = scene.clone()
    processedSceneRef.current = cloned
    
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
  }, [scene])

  // Очистка ресурсов при размонтировании
  useEffect(() => {
    return () => {
      if (processedSceneRef.current) {
        disposeScene(processedSceneRef.current)
        processedSceneRef.current = null
      }
    }
  }, [])

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

export default function ModelThumbnail({ modelPath, className }: ModelThumbnailProps) {
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const webglContextRef = useRef<WebGLRenderingContext | WebGL2RenderingContext | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

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
      // Очистка WebGL контекста (если расширение поддерживается)
      if (webglContextRef.current) {
        try {
          const loseContext = (webglContextRef.current as any).getExtension?.('WEBGL_lose_context')
          if (loseContext && loseContext.loseContext) {
            loseContext.loseContext()
          }
        } catch (error) {
          // Расширение не поддерживается - это нормально, основная очистка через dispose()
        }
        webglContextRef.current = null
      }
    }
  }, [])

  const fallback = (
    <div className={`relative w-full h-full bg-gray-100 flex items-center justify-center ${className || ''}`}>
      <div className="text-gray-400 text-xs">3D</div>
    </div>
  )

  if (!isVisible) {
    return (
      <div ref={containerRef} className={`relative w-full h-full bg-gray-100 flex items-center justify-center ${className || ''}`}>
        <div className="text-gray-400 text-xs">3D</div>
      </div>
    )
  }

  return (
    <ModelThumbnailErrorBoundary fallback={fallback}>
      <div ref={containerRef} className={`relative w-full h-full bg-gray-100 ${className || ''}`}>
        <Canvas
          gl={{ 
            antialias: false, 
            alpha: true,
            powerPreference: 'low-power',
            preserveDrawingBuffer: false,
          }}
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 1.5]}
          frameloop="demand"
          onCreated={({ gl }) => {
            webglContextRef.current = gl.getContext() as WebGLRenderingContext | WebGL2RenderingContext
          }}
        >
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




