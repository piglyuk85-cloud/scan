'use client'

import React, { ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

interface ThreeProviderProps {
  children: ReactNode
  gl?: Partial<THREE.WebGLRendererParameters>
  camera?: {
    position?: [number, number, number]
    fov?: number
  }
  style?: React.CSSProperties
  dpr?: number | [number, number]
  frameloop?: 'always' | 'demand' | 'never'
  shadows?: boolean
  performance?: {
    min?: number
    max?: number
  }
  onCreated?: (state: { gl: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera }) => void
}

/**
 * Единый провайдер Canvas для всех Three.js компонентов
 * Гарантирует правильную инициализацию и загрузку только на клиенте
 */
export default function ThreeProvider({
  children,
  gl = {},
  camera = { position: [0, 0, 5], fov: 50 },
  style = { width: '100%', height: '100%' },
  dpr = [1, 2],
  frameloop = 'always',
  shadows = false,
  performance,
  onCreated,
}: ThreeProviderProps) {
  // Проверка доступности на клиенте
  if (typeof window === 'undefined') {
    return null
  }

  // Проверка доступности THREE.js
  if (!THREE || !THREE.Scene || !THREE.WebGLRenderer) {
    console.warn('Three.js не доступен')
    return null
  }

  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
        ...gl,
      }}
      camera={{
        position: camera.position || [0, 0, 5],
        fov: camera.fov || 50,
      }}
      style={style}
      dpr={dpr}
      frameloop={frameloop}
      shadows={shadows}
      performance={performance}
      onCreated={onCreated}
    >
      {children}
    </Canvas>
  )
}
