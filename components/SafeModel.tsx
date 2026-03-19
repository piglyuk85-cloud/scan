'use client'

import React, { Suspense, useRef, useMemo, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

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

interface SafeModelProps {
  modelPath: string
  /** Прозрачность (1 = полностью непрозрачно). Для эффекта фокуса у невыбранных — 0.35 */
  opacity?: number
  /** Интенсивность свечения для выделения выбранного объекта */
  emissiveIntensity?: number
  /** Цвет свечения (например, '#3b82f6') */
  emissiveColor?: string
  /** Подсветка при наведении курсора */
  isHovered?: boolean
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void
  onPointerOver?: (event: ThreeEvent<PointerEvent>) => void
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void
  interactionId?: string
  isMobile?: boolean
  isSelected?: boolean
}

function ModelLoader({
  modelPath,
  opacity = 1,
  emissiveIntensity = 0,
  emissiveColor = '#3b82f6',
  isHovered = false,
  onPointerDown,
  onPointerUp,
  onPointerOver,
  onPointerOut,
  interactionId,
  isMobile = false,
  isSelected = false,
}: {
  modelPath: string
  opacity?: number
  emissiveIntensity?: number
  emissiveColor?: string
  isHovered?: boolean
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void
  onPointerOver?: (event: ThreeEvent<PointerEvent>) => void
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void
  interactionId?: string
  isMobile?: boolean
  isSelected?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const processedSceneRef = useRef<THREE.Group | null>(null)
  const standardMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([])
  const emissiveCurrentRef = useRef(0)
  const emissiveTargetRef = useRef(0)
  const selectionRingRef = useRef<THREE.Mesh>(null)

  const normalizedPath = modelPath.startsWith('/') ? modelPath : `/${modelPath}`
  const { scene } = useGLTF(normalizedPath, DRACO_DECODER_URL) as { scene: THREE.Group }

  useEffect(() => {
    useGLTF.preload(normalizedPath, DRACO_DECODER_URL)
  }, [normalizedPath])

  const { processedScene, proxyCenter, proxySize } = useMemo(() => {
    if (!scene) {
      return {
        processedScene: null,
        proxyCenter: [0, 0.5, 0] as [number, number, number],
        proxySize: [1, 1, 1] as [number, number, number],
      }
    }

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

    const finalBox = new THREE.Box3().setFromObject(clonedScene)
    const finalSize = finalBox.getSize(new THREE.Vector3())
    const finalCenter = finalBox.getCenter(new THREE.Vector3())

    return {
      processedScene: clonedScene,
      proxyCenter: [finalCenter.x, finalCenter.y, finalCenter.z] as [number, number, number],
      proxySize: [
        Math.max(finalSize.x, 0.6),
        Math.max(finalSize.y, 0.6),
        Math.max(finalSize.z, 0.6),
      ] as [number, number, number],
    }
  }, [scene])

  // Управление жизненным циклом clonedScene переносим в эффект, чтобы не делать side-effects в рендере
  useEffect(() => {
    const previousScene = processedSceneRef.current
    processedSceneRef.current = processedScene

    if (previousScene && previousScene !== processedScene) {
      const rafId = requestAnimationFrame(() => {
        disposeScene(previousScene)
      })
      return () => cancelAnimationFrame(rafId)
    }
    return
  }, [processedScene])

  // Применяем opacity и emissive к материалам при изменении пропсов
  useEffect(() => {
    const root = processedSceneRef.current
    if (!root) return
    const color = new THREE.Color(emissiveColor)
    const hoverBoost = isHovered ? 0.22 : 0
    emissiveTargetRef.current = emissiveIntensity + hoverBoost
    const collectedMaterials: THREE.MeshStandardMaterial[] = []

    root.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            collectedMaterials.push(mat)
            mat.envMapIntensity = 1.5
            mat.transparent = opacity < 1
            mat.opacity = opacity
            mat.emissive = color.clone()
            mat.emissiveIntensity = emissiveCurrentRef.current
          } else if (mat instanceof THREE.MeshBasicMaterial) {
            mat.transparent = opacity < 1
            mat.opacity = opacity
          }
        })
      }
    })
    standardMaterialsRef.current = collectedMaterials
  }, [opacity, emissiveIntensity, emissiveColor, isHovered])

  // Плавный переход подсветки (~150-200ms), чтобы избежать резкой "вспышки" на hover
  useFrame((_, delta) => {
    const smoothing = 1 - Math.exp(-delta * 12)
    emissiveCurrentRef.current = THREE.MathUtils.lerp(
      emissiveCurrentRef.current,
      emissiveTargetRef.current,
      smoothing
    )
    const materials = standardMaterialsRef.current
    for (let i = 0; i < materials.length; i++) {
      materials[i].emissiveIntensity = emissiveCurrentRef.current
    }

    if (selectionRingRef.current) {
      const pulse = 0.85 + Math.sin(performance.now() * 0.006) * 0.12
      selectionRingRef.current.scale.setScalar(pulse)
    }
  })

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
      <mesh
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
    )
  }

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {isMobile && isSelected && (
        <mesh
          ref={selectionRingRef}
          position={[proxyCenter[0], 0.03, proxyCenter[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={2}
        >
          <ringGeometry args={[Math.max(proxySize[0], proxySize[2]) * 0.45, Math.max(proxySize[0], proxySize[2]) * 0.62, 48]} />
          <meshBasicMaterial color="#f5d47a" transparent opacity={0.75} depthWrite={false} />
        </mesh>
      )}
      <mesh
        position={proxyCenter}
        visible={false}
        castShadow={false}
        receiveShadow={false}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        userData={{ interactionProxy: true, exhibitId: interactionId }}
      >
        <boxGeometry args={proxySize} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <primitive object={processedScene} position={[0, 0, 0]} raycast={() => {}} />
    </group>
  )
}

export default function SafeModelWrapper({
  modelPath,
  opacity = 1,
  emissiveIntensity = 0,
  emissiveColor = '#3b82f6',
  isHovered = false,
  onPointerDown,
  onPointerUp,
  onPointerOver,
  onPointerOut,
  interactionId,
  isMobile = false,
  isSelected = false,
}: SafeModelProps) {
  if (!modelPath || !modelPath.trim()) {
    return (
      <mesh
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
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
          <mesh
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerOver={onPointerOver}
            onPointerOut={onPointerOut}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#d1d5db" />
          </mesh>
        }
      >
        <ModelLoader
          modelPath={modelPath}
          opacity={opacity}
          emissiveIntensity={emissiveIntensity}
          emissiveColor={emissiveColor}
          isHovered={isHovered}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
          interactionId={interactionId}
          isMobile={isMobile}
          isSelected={isSelected}
        />
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
