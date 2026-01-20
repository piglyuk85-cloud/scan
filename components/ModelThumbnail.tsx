'use client'

import React, { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface ModelThumbnailProps {
  modelPath: string
  className?: string
}

function ModelPreview({ modelPath }: { modelPath: string }) {
  const { scene } = useGLTF(modelPath) as { scene: THREE.Group }

  const processedScene = useMemo(() => {
    if (!scene) return null

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
  const fallback = (
    <div className={`relative w-full h-full bg-gray-100 flex items-center justify-center ${className || ''}`}>
      <div className="text-gray-400 text-xs">3D</div>
    </div>
  )

  return (
    <ModelThumbnailErrorBoundary fallback={fallback}>
      <div className={`relative w-full h-full bg-gray-100 ${className || ''}`}>
        <Canvas
          gl={{ antialias: false, alpha: true }}
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
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
