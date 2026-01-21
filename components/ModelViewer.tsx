'use client'

import React, { Suspense, useRef, useMemo, useState, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface ModelViewerProps {
  modelPath: string
}

function Model({ 
  modelPath, 
  onModelLoaded 
}: { 
  modelPath: string
  onModelLoaded?: (center: [number, number, number], size: [number, number, number]) => void
}) {
  const onModelLoadedRef = useRef(onModelLoaded)
  const hasCalledRef = useRef(false)
  const lastModelPathRef = useRef<string | null>(null)
  
  // Обновляем ref при изменении функции
  useEffect(() => {
    onModelLoadedRef.current = onModelLoaded
  }, [onModelLoaded])
  
  // Сбрасываем флаг при изменении modelPath
  useEffect(() => {
    if (lastModelPathRef.current !== modelPath) {
      hasCalledRef.current = false
      lastModelPathRef.current = modelPath
    }
  }, [modelPath])
  
  // Нормализуем путь - добавляем / если его нет
  const normalizedPath = modelPath.startsWith('/') ? modelPath : `/${modelPath}`
  
  // useGLTF может выбросить ошибку, но она будет перехвачена ErrorBoundary
  const { scene } = useGLTF(normalizedPath) as { scene: THREE.Group }
  
  const meshRef = useRef<THREE.Group>(null)

  const { processedScene, modelCenter, modelSize } = useMemo(() => {
    if (!scene) {
      return { 
        processedScene: null, 
        modelCenter: [0, 0, 0] as [number, number, number], 
        modelSize: [0, 0, 0] as [number, number, number] 
      }
    }

    const clonedScene = scene.clone()
    
    const box = new THREE.Box3().setFromObject(clonedScene)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    
    const TARGET_MAX_SIZE = 4.5
    
    const scale = maxDim > 0 ? TARGET_MAX_SIZE / maxDim : 1
    
    clonedScene.scale.set(scale, scale, scale)
    
    const scaledBox = new THREE.Box3().setFromObject(clonedScene)
    const scaledSize = scaledBox.getSize(new THREE.Vector3())
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3())
    
    clonedScene.position.x = -scaledCenter.x
    clonedScene.position.y = -scaledCenter.y
    clonedScene.position.z = -scaledCenter.z
    
    return {
      processedScene: clonedScene,
      modelCenter: [scaledCenter.x, scaledCenter.y, scaledCenter.z] as [number, number, number],
      modelSize: [scaledSize.x, scaledSize.y, scaledSize.z] as [number, number, number]
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelPath, scene])

  useEffect(() => {
    if (processedScene && onModelLoadedRef.current && !hasCalledRef.current) {
      hasCalledRef.current = true
      onModelLoadedRef.current(modelCenter, modelSize)
    }
  }, [processedScene, modelCenter, modelSize])

  if (!processedScene) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#9ca3af" />
      </mesh>
    )
  }

  return (
    <primitive
      ref={meshRef}
      object={processedScene}
      position={[0, 0, 0]}
    />
  )
}

function AdaptiveCamera({ modelCenter, modelSize }: { modelCenter: [number, number, number], modelSize: [number, number, number] }) {
  const cameraDistance = useMemo(() => {
    const maxSize = Math.max(modelSize[0], modelSize[1], modelSize[2])
    return Math.max(6, maxSize * 1.8)
  }, [modelSize])

  const cameraHeight = useMemo(() => {
    return modelSize[1] * 0.3
  }, [modelSize])

  return (
    <>
      <PerspectiveCamera 
        makeDefault 
        position={[0, cameraHeight, cameraDistance]} 
        fov={45} 
      />
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={cameraDistance * 0.6}
        maxDistance={cameraDistance * 2}
        autoRotate={false}
        target={modelCenter}
      />
    </>
  )
}


// ErrorBoundary для обработки ошибок загрузки моделей
class ModelErrorBoundary extends React.Component<
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
    console.warn('Ошибка загрузки модели в ModelViewer:', error.message)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

function ModelViewer({ modelPath }: ModelViewerProps) {
  const [modelData, setModelData] = useState<{ center: [number, number, number], size: [number, number, number] } | null>(null)

  const handleModelLoaded = useCallback((center: [number, number, number], size: [number, number, number]) => {
    setModelData({ center, size })
  }, [])

  if (!modelPath || !modelPath.trim()) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-gray-500 text-center">
          <p>3D модель не загружена</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <Canvas
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, 5, -5]} intensity={0.4} />
        <pointLight position={[0, 10, 0]} intensity={0.3} />
        <Environment preset="city" />
        <Suspense
          fallback={
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#9ca3af" />
            </mesh>
          }
        >
          <ModelErrorBoundary
            fallback={
              <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#9ca3af" />
              </mesh>
            }
          >
            <Model 
              modelPath={modelPath} 
              onModelLoaded={handleModelLoaded}
            />
          </ModelErrorBoundary>
        </Suspense>
        {modelData ? (
          <AdaptiveCamera modelCenter={modelData.center} modelSize={modelData.size} />
        ) : (
          <>
            <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={45} />
            <OrbitControls
              enableZoom={true}
              enablePan={false}
              minDistance={4}
              maxDistance={15}
              autoRotate={false}
              target={[0, 0, 0]}
            />
          </>
        )}
      </Canvas>
    </div>
  )
}


export default ModelViewer

