'use client'

import React, { Suspense, useRef, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface SafeModelProps {
  modelPath: string
}

function ModelLoader({ modelPath }: { modelPath: string }) {
  const groupRef = useRef<THREE.Group>(null)

  const normalizedPath = modelPath.startsWith('/') ? modelPath : `/${modelPath}`
  const { scene } = useGLTF(normalizedPath) as { scene: THREE.Group }

  const processedScene = useMemo(() => {
    if (!scene) return null

    const clonedScene = scene.clone()

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
