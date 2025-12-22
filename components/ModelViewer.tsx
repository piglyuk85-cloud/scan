'use client'

import { Suspense, useRef, useMemo, useState, useEffect } from 'react'
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
  const { scene } = useGLTF(modelPath) as { scene: THREE.Group }
  const meshRef = useRef<THREE.Group>(null)

  // Автоматическое центрирование и масштабирование модели
  // Используем useMemo для стабильности - обрабатываем только один раз
  const { processedScene, modelCenter, modelSize } = useMemo(() => {
    if (!scene) return { processedScene: null, modelCenter: [0, 0, 0] as [number, number, number], modelSize: [0, 0, 0] as [number, number, number] }

    // Клонируем сцену, чтобы не изменять оригинал
    const clonedScene = scene.clone()
    
    // Вычисляем bounding box исходной сцены
    const box = new THREE.Box3().setFromObject(clonedScene)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    
    // Целевой размер для модели в просмотре
    const TARGET_MAX_SIZE = 4.5
    
    // Вычисляем масштаб
    const scale = maxDim > 0 ? TARGET_MAX_SIZE / maxDim : 1
    
    // Применяем масштаб равномерно по всем осям
    clonedScene.scale.set(scale, scale, scale)
    
    // Пересчитываем bounding box после масштабирования
    const scaledBox = new THREE.Box3().setFromObject(clonedScene)
    const scaledSize = scaledBox.getSize(new THREE.Vector3())
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3())
    
    // Центрируем модель по всем осям
    clonedScene.position.x = -scaledCenter.x
    clonedScene.position.y = -scaledCenter.y
    clonedScene.position.z = -scaledCenter.z
    
    return {
      processedScene: clonedScene,
      modelCenter: [scaledCenter.x, scaledCenter.y, scaledCenter.z] as [number, number, number],
      modelSize: [scaledSize.x, scaledSize.y, scaledSize.z] as [number, number, number]
    }
  }, [scene])

  // Передаем данные о модели в родительский компонент
  useEffect(() => {
    if (processedScene && onModelLoaded) {
      onModelLoaded(modelCenter, modelSize)
    }
  }, [processedScene, modelCenter, modelSize, onModelLoaded])

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

// Компонент для настройки камеры на основе модели
function AdaptiveCamera({ modelCenter, modelSize }: { modelCenter: [number, number, number], modelSize: [number, number, number] }) {
  const cameraDistance = useMemo(() => {
    // Вычисляем оптимальное расстояние камеры на основе размера модели
    const maxSize = Math.max(modelSize[0], modelSize[1], modelSize[2])
    // Расстояние должно быть примерно в 1.5-2 раза больше максимального размера
    return Math.max(6, maxSize * 1.8)
  }, [modelSize])

  const cameraHeight = useMemo(() => {
    // Высота камеры зависит от высоты модели
    // Для высоких моделей поднимаем камеру выше
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


function ModelViewer({ modelPath }: ModelViewerProps) {
  const [modelData, setModelData] = useState<{ center: [number, number, number], size: [number, number, number] } | null>(null)

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
          <Model 
            modelPath={modelPath} 
            onModelLoaded={(center, size) => setModelData({ center, size })}
          />
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

