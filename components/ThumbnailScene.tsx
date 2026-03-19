'use client'

// КРИТИЧЕСКИ ВАЖНО: THREE должен импортироваться ПЕРВЫМ, до всех остальных импортов
import * as THREE from 'three'
import React, { Suspense, useMemo, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, useGLTF } from '@react-three/drei'

const DRACO_DECODER_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/gltf/'

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

interface ThumbnailSceneProps {
  modelPath: string
  onCreated?: (gl: any) => void
}

function ModelPreview({ modelPath }: { modelPath: string }) {
  const normalizedPath = modelPath.startsWith('/') ? modelPath : `/${modelPath}`
  const { scene } = useGLTF(normalizedPath, DRACO_DECODER_URL) as { scene: THREE.Group }
  const processedSceneRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    useGLTF.preload(normalizedPath, DRACO_DECODER_URL)
  }, [normalizedPath])

  const processedScene = useMemo(() => {
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

export default function ThumbnailScene({ modelPath, onCreated }: ThumbnailSceneProps) {
  return (
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
      onCreated={onCreated}
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
  )
}
