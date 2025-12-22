'use client'

import { Suspense, useRef, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface SafeModelProps {
  modelPath: string
}

// Компонент для загрузки модели с правильным масштабированием
function ModelLoader({ modelPath }: { modelPath: string }) {
  const groupRef = useRef<THREE.Group>(null)
  
  // useGLTF должен быть вызван безусловно (правило хуков React)
  const { scene } = useGLTF(modelPath) as { scene: THREE.Group }

  // Автоматическое масштабирование и центрирование модели
  // Используем useMemo для стабильности - обрабатываем только один раз
  const processedScene = useMemo(() => {
    if (!scene) return null

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

  if (!processedScene) {
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

// Обертка с Suspense для безопасной загрузки
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
      <ModelLoader modelPath={modelPath} />
    </Suspense>
  )
}
