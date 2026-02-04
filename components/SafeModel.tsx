'use client'

import React, { Suspense, useRef, useMemo, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
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

interface SafeModelProps {
  modelPath: string
}

function ModelLoader({ modelPath }: { modelPath: string }) {
  const groupRef = useRef<THREE.Group>(null)
  const processedSceneRef = useRef<THREE.Group | null>(null)

  const normalizedPath = modelPath.startsWith('/') ? modelPath : `/${modelPath}`
  const { scene } = useGLTF(normalizedPath) as { scene: THREE.Group }

  const processedScene = useMemo(() => {
    // Освобождаем предыдущую сцену перед созданием новой
    if (processedSceneRef.current) {
      disposeScene(processedSceneRef.current)
      processedSceneRef.current = null
    }

    if (!scene) return null

    const clonedScene = scene.clone()
    processedSceneRef.current = clonedScene

    const box = new THREE.Box3().setFromObject(clonedScene)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)

    const TARGET_MAX_SIZE = 2.0
    const scale = maxDim > 0 ? TARGET_MAX_SIZE / maxDim : 1
    clonedScene.scale.set(scale, scale, scale)

    const scaledBox = new THREE.Box3().setFromObject(clonedScene)
    const centerX = scaledBox.getCenter(new THREE.Vector3()).x
    const centerZ = scaledBox.getCenter(new THREE.Vector3()).z
    clonedScene.position.x = -centerX
    clonedScene.position.z = -centerZ

    const minY = scaledBox.min.y
    clonedScene.position.y = -minY + 0.05

    return clonedScene
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

  return (
    <primitive
      ref={groupRef}
      object={processedScene}
      position={[0, 0, 0]}
    />
  )
}

export default function SafeModelWrapper({ modelPath }: SafeModelProps) {
  if (!modelPath || !modelPath.trim()) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
    )
  }

  return (
    <Suspense
      fallback={
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#d1d5db" />
        </mesh>
      }
    >
      <ErrorBoundary
        fallback={
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#d1d5db" />
          </mesh>
        }
      >
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
