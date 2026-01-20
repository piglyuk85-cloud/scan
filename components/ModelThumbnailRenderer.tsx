'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface ModelThumbnailRendererProps {
  modelPath: string
  onRenderComplete: (imageDataUrl: string) => void
}

function ModelPreview({ modelPath }: { modelPath: string }) {
  const { scene } = useGLTF(modelPath) as { scene: THREE.Group }

  const processedScene = React.useMemo(() => {
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

function RenderCapture({ onRenderComplete }: { onRenderComplete: (url: string) => void }) {
  const { gl, scene, camera } = useThree()
  const [hasRendered, setHasRendered] = useState(false)

  useEffect(() => {
    if (hasRendered) return

    const timer = setTimeout(() => {
      try {
        gl.render(scene, camera)
        const dataUrl = gl.domElement.toDataURL('image/png', 0.9)
        onRenderComplete(dataUrl)
        setHasRendered(true)
      } catch (error) {
        console.warn('Ошибка создания скриншота:', error)
        onRenderComplete('')
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [gl, scene, camera, hasRendered, onRenderComplete])

  return null
}

export default function ModelThumbnailRenderer({ modelPath, onRenderComplete }: ModelThumbnailRendererProps) {
  return (
    <div style={{ position: 'absolute', width: 256, height: 256, top: '-9999px', left: '-9999px' }}>
      <Canvas
        gl={{ 
          antialias: false, 
          alpha: true,
          powerPreference: 'low-power',
          preserveDrawingBuffer: true,
        }}
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ width: 256, height: 256 }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <directionalLight position={[-10, 5, -5]} intensity={0.4} />
        <Environment preset="city" />
        
        <React.Suspense
          fallback={
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#d1d5db" />
            </mesh>
          }
        >
          <ModelPreview modelPath={modelPath} />
          <RenderCapture onRenderComplete={onRenderComplete} />
        </React.Suspense>
        
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
  )
}
