'use client'

import React, { Suspense, useRef, useMemo, useState, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface SafeModelProps {
  modelPath: string
}

function ModelLoader({ modelPath }: { modelPath: string }) {
  const groupRef = useRef<THREE.Group>(null)
  const [hasError, setHasError] = useState(false)
  
  let scene: THREE.Group | null = null
  try {
    const gltf = useGLTF(modelPath, true) as { scene: THREE.Group }
    scene = gltf.scene
  } catch (error) {
    console.warn('Ошибка загрузки модели:', modelPath, error)
    setHasError(true)
  }

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes(modelPath) || event.filename?.includes(modelPath)) {
        setHasError(true)
      }
    }
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [modelPath])

  const processedScene = useMemo(() => {
    if (hasError || !scene) return null

    // Клонируем сцену, чтобы не изменять оригинал
    const clonedScene = scene.clone()
    
    // Вычисляем bounding box исходной сцены
    const box = new THREE.Box3().setFromObject(clonedScene)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    
    // Целевой размер для всех моделей (единый стандарт)
    const TARGET_MAX_SIZE = 2.0
    
    // Вычисляем масштаб для строгой нормализации
    const scale = maxDim > 0 ? TARGET_MAX_SIZE / maxDim : 1
    
    // Применяем масштаб равномерно по всем осям (сохраняем пропорции)
    clonedScene.scale.set(scale, scale, scale)
    
    // Пересчитываем bounding box после масштабирования
    const scaledBox = new THREE.Box3().setFromObject(clonedScene)
    
    // Центрируем модель по X и Z осям
    const centerX = scaledBox.getCenter(new THREE.Vector3()).x
    const centerZ = scaledBox.getCenter(new THREE.Vector3()).z
    clonedScene.position.x = -centerX
    clonedScene.position.z = -centerZ
    
    // Выравниваем нижнюю часть модели на уровне y = 0
    const minY = scaledBox.min.y
    clonedScene.position.y = -minY + 0.05 // Небольшой отступ для безопасности
    
    return clonedScene
  }, [scene])

  if (hasError || !processedScene) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
    )
  }

  return (
    <primitive
      ref={groupRef}
      object={processedScene}
      position={[0, 0, 0]}
    />
  )
}

export default function SafeModelWrapper({ modelPath }: SafeModelProps) {
  return (
    <Suspense
      fallback={
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#d1d5db" />
        </mesh>
      }
    >
      <ErrorBoundary fallback={
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#d1d5db" />
        </mesh>
      }>
        <ModelLoader modelPath={modelPath} />
      </ErrorBoundary>
    </Suspense>
  )
}

class ErrorBoundary extends React.Component<
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
    console.warn('Ошибка загрузки модели:', error.message)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}
