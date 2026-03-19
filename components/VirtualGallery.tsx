'use client'

import React, { Suspense, useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { PerspectiveCamera, Environment, Html, MeshReflectorMaterial, PerformanceMonitor, useProgress } from '@react-three/drei'
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { Exhibit } from '@/types/exhibit'
import { useRouter } from 'next/navigation'
import SafeModelWrapper from './SafeModel'
import FirstPersonControls from './FirstPersonControls'
import MobileControls from './MobileControls'
import MobileJoystick from './MobileJoystick'
import ExhibitOverlay from './ExhibitOverlay'

const GALLERY_BOUNDS = {
  minX: -24,
  maxX: 24,
  minZ: -24,
  maxZ: 24,
  minY: 0.5,
  maxY: 7,
}

const DEFAULT_SPAWN_POSITION = new THREE.Vector3(0, 1.7, 5)

class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode; modelPath?: string },
  { hasError: boolean; retryCount: number }
> {
  private retryTimeout?: NodeJS.Timeout

  constructor(props: { children: React.ReactNode; fallback: React.ReactNode; modelPath?: string }) {
    super(props)
    this.state = { hasError: false, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error, prevState: { hasError: boolean; retryCount: number }) {
    return { hasError: true, retryCount: prevState.retryCount }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('Ошибка загрузки модели в VirtualGallery:', this.props.modelPath, error.message)
    
    if (this.state.retryCount < 1) {
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout)
      }
      this.retryTimeout = setTimeout(() => {
        this.setState({ hasError: false, retryCount: this.state.retryCount + 1 })
      }, 3000)
    }
  }

  componentDidUpdate(prevProps: { children: React.ReactNode; fallback: React.ReactNode; modelPath?: string }) {
    if (prevProps.modelPath !== this.props.modelPath && this.state.hasError) {
      this.setState({ hasError: false, retryCount: 0 })
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = undefined
    }
  }

  render() {
    if (this.state.hasError && this.state.retryCount >= 1) {
      return this.props.fallback
    }
    return this.props.children
  }
}

interface VirtualGalleryProps {
  exhibits: Exhibit[]
}

function PerformanceQualityController({
  isMobile,
  setLowPerformanceMode,
  setDynamicShadows,
}: {
  isMobile: boolean
  setLowPerformanceMode: React.Dispatch<React.SetStateAction<boolean>>
  setDynamicShadows: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const isLowRef = useRef(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMobile) {
      setDynamicShadows(false)
      return
    }
    if (!isLowRef.current) {
      setDynamicShadows(true)
    }
  }, [isMobile, setDynamicShadows])

  if (!isMounted) return null
  if (!gl || !camera || !scene) return null

  return (
    <PerformanceMonitor
      bounds={() => [35, 58]}
      onDecline={({ fps }) => {
        if (fps < 35 && !isLowRef.current) {
          isLowRef.current = true
          setLowPerformanceMode(true)
          setDynamicShadows(false)
        }
      }}
      onIncline={({ fps }) => {
        if (fps > 50 && isLowRef.current) {
          isLowRef.current = false
          setLowPerformanceMode(false)
          if (!isMobile) {
            setDynamicShadows(true)
          }
        }
      }}
      onFallback={() => {
        if (!isLowRef.current) {
          isLowRef.current = true
          setLowPerformanceMode(true)
          setDynamicShadows(false)
        }
      }}
    />
  )
}

function PostProcessingEffects({ isMobile }: { isMobile: boolean }) {
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return null
  if (!gl || !camera || !scene) return null

  if (isMobile) {
    return (
      <EffectComposer>
        <Bloom luminanceThreshold={1} intensity={0.8} mipmapBlur />
      </EffectComposer>
    )
  }

  return (
    <EffectComposer>
      <Bloom luminanceThreshold={1} intensity={1.2} mipmapBlur />
      <SSAO
        blendFunction={BlendFunction.MULTIPLY}
        intensity={15}
        radius={0.05}
        luminanceInfluence={0.3}
      />
    </EffectComposer>
  )
}

function CanvasLoader() {
  const { active, progress } = useProgress()

  const safeProgress = Math.max(0, Math.min(100, progress))
  const isDone = safeProgress >= 100 && !active

  return (
    <Html center>
      <div
        className={`w-[300px] sm:w-[360px] rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/95 p-6 shadow-2xl transition-opacity duration-500 ${isDone ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div className="mb-4 text-center">
          <div className="text-2xl font-bold tracking-tight text-slate-900">ВГУ Галерея</div>
          <div className="mt-1 text-sm text-slate-600">Загрузка экспонатов</div>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 transition-all duration-200"
            style={{ width: `${safeProgress}%` }}
          />
        </div>

        <div className="mt-3 text-center text-sm font-medium text-slate-700">
          {Math.round(safeProgress)}%
        </div>
      </div>
    </Html>
  )
}

function SceneReadyController({ onReady }: { onReady: () => void }) {
  const { active, progress } = useProgress()
  const hasReportedReadyRef = useRef(false)

  useEffect(() => {
    if (!active && progress >= 100 && !hasReportedReadyRef.current) {
      hasReportedReadyRef.current = true
      onReady()
    }
  }, [active, progress, onReady])

  return null
}

function CenterRaycastInteraction({
  enabled,
  onActivate,
  onHoverChange,
}: {
  enabled: boolean
  onActivate: (id: string) => void
  onHoverChange: (id: string | null) => void
}) {
  const { camera, scene, gl } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const centerNdc = useMemo(() => new THREE.Vector2(0, 0), [])
  const hoveredIdRef = useRef<string | null>(null)
  const lastSampleRef = useRef(0)

  useFrame((state) => {
    if (!enabled) {
      if (hoveredIdRef.current !== null) {
        hoveredIdRef.current = null
        onHoverChange(null)
      }
      return
    }

    if (typeof document === 'undefined' || document.pointerLockElement !== gl.domElement) {
      if (hoveredIdRef.current !== null) {
        hoveredIdRef.current = null
        onHoverChange(null)
      }
      return
    }

    // Ограничиваем частоту рейкаста до 10 Гц для снижения нагрузки
    if (state.clock.elapsedTime - lastSampleRef.current < 0.1) return
    lastSampleRef.current = state.clock.elapsedTime

    raycaster.setFromCamera(centerNdc, camera)
    const intersections = raycaster.intersectObjects(scene.children, true)
    const hit = intersections.find(({ object }) => {
      return object.userData?.interactionProxy === true && typeof object.userData?.exhibitId === 'string'
    })

    const nextHoveredId = hit ? (hit.object.userData.exhibitId as string) : null
    if (nextHoveredId !== hoveredIdRef.current) {
      hoveredIdRef.current = nextHoveredId
      onHoverChange(nextHoveredId)
    }
  })

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (!enabled || event.button !== 0) return
      if (typeof document === 'undefined' || document.pointerLockElement !== gl.domElement) return
      const exhibitId = hoveredIdRef.current
      if (exhibitId) onActivate(exhibitId)
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [enabled, gl.domElement, onActivate])

  return null
}

function MobileTouchInteraction({
  enabled,
  onTapExhibit,
  onTapEmpty,
  lookActiveRef,
  lookTouchIdRef,
  lookGestureTimeRef,
  tapSuppressionUntilRef,
}: {
  enabled: boolean
  onTapExhibit: (id: string, x: number, y: number) => void
  onTapEmpty: (x: number, y: number) => void
  lookActiveRef: React.MutableRefObject<boolean>
  lookTouchIdRef: React.MutableRefObject<number | null>
  lookGestureTimeRef: React.MutableRefObject<number>
  tapSuppressionUntilRef: React.MutableRefObject<number>
}) {
  const { camera, scene, gl } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const touchStartMapRef = useRef(new Map<number, { x: number; y: number; time: number; blocked: boolean; moved: boolean }>())
  const TAP_MAX_MOVE = 30
  const TAP_MAX_DURATION = 300
  const SWIPE_CANCEL_DISTANCE = 12
  const LOOK_TAP_GUARD_MS = 180

  useEffect(() => {
    if (!enabled) {
      touchStartMapRef.current.clear()
      return
    }

    const handleTouchStart = (event: TouchEvent) => {
      const now = performance.now()
      for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i]
        const target = touch.target as Element | null
        const blocked = !!target?.closest('.mobile-joystick-ui') || lookActiveRef.current || touch.identifier === lookTouchIdRef.current || now < tapSuppressionUntilRef.current
        touchStartMapRef.current.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY,
          time: performance.now(),
          blocked,
          moved: false,
        })
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i]
        const start = touchStartMapRef.current.get(touch.identifier)
        if (!start) continue
        // Если touch уже занят look-контролом, полностью исключаем его из tap-пайплайна
        if (lookActiveRef.current || touch.identifier === lookTouchIdRef.current) {
          if (!start.moved) {
            touchStartMapRef.current.set(touch.identifier, { ...start, moved: true })
          }
          continue
        }
        const dx = touch.clientX - start.x
        const dy = touch.clientY - start.y
        if (dx * dx + dy * dy > SWIPE_CANCEL_DISTANCE * SWIPE_CANCEL_DISTANCE) {
          touchStartMapRef.current.set(touch.identifier, { ...start, moved: true })
        }
      }
    }

    const handleTouchEnd = (event: TouchEvent) => {
      if (lookActiveRef.current) return
      const now = performance.now()
      if (now < tapSuppressionUntilRef.current) return
      if (now - lookGestureTimeRef.current < LOOK_TAP_GUARD_MS) return
      const rect = gl.domElement.getBoundingClientRect()
      for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i]
        if (touch.identifier === lookTouchIdRef.current) continue
        const start = touchStartMapRef.current.get(touch.identifier)
        touchStartMapRef.current.delete(touch.identifier)
        if (!start || start.blocked || start.moved) continue

        const dx = touch.clientX - start.x
        const dy = touch.clientY - start.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const dt = performance.now() - start.time
        if (dist > TAP_MAX_MOVE || dt > TAP_MAX_DURATION) continue

        const ndc = new THREE.Vector2(
          ((touch.clientX - rect.left) / rect.width) * 2 - 1,
          -((touch.clientY - rect.top) / rect.height) * 2 + 1
        )
        raycaster.setFromCamera(ndc, camera)
        const intersections = raycaster.intersectObjects(scene.children, true)
        const hit = intersections.find(({ object }) => {
          return object.userData?.interactionProxy === true && typeof object.userData?.exhibitId === 'string'
        })

        const hitName = hit?.object?.name || 'none'
        console.log(`Tap detected at [${Math.round(touch.clientX)},${Math.round(touch.clientY)}], hit object: ${hitName}`)

        if (hit) {
          onTapExhibit(hit.object.userData.exhibitId as string, touch.clientX, touch.clientY)
        } else {
          onTapEmpty(touch.clientX, touch.clientY)
        }
      }
    }

    const handleTouchCancel = (event: TouchEvent) => {
      for (let i = 0; i < event.changedTouches.length; i++) {
        touchStartMapRef.current.delete(event.changedTouches[i].identifier)
      }
    }

    gl.domElement.addEventListener('touchstart', handleTouchStart, { passive: true })
    gl.domElement.addEventListener('touchmove', handleTouchMove, { passive: true })
    gl.domElement.addEventListener('touchend', handleTouchEnd, { passive: true })
    gl.domElement.addEventListener('touchcancel', handleTouchCancel, { passive: true })
    return () => {
      gl.domElement.removeEventListener('touchstart', handleTouchStart)
      gl.domElement.removeEventListener('touchmove', handleTouchMove)
      gl.domElement.removeEventListener('touchend', handleTouchEnd)
      gl.domElement.removeEventListener('touchcancel', handleTouchCancel)
      touchStartMapRef.current.clear()
    }
  }, [camera, enabled, gl.domElement, lookActiveRef, lookGestureTimeRef, lookTouchIdRef, onTapEmpty, onTapExhibit, raycaster, scene.children, tapSuppressionUntilRef])

  return null
}

const ExhibitInSpace = React.memo(function ExhibitInSpace({
  exhibit,
  position,
  scale,
  rotationY,
  onClick,
  onMobileSelect,
  isMobile,
  isCenterHovered,
  isMobileSelected,
}: {
  exhibit: Exhibit
  position: [number, number, number]
  scale: number
  rotationY: number
  onClick: () => void
  onMobileSelect: () => void
  isMobile: boolean
  isCenterHovered: boolean
  isMobileSelected: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const modelGroupRef = useRef<THREE.Group>(null)
  const { gl } = useThree()
  const [localHovered, setLocalHovered] = useState(false)
  const pointerStartRef = useRef<{ x: number; y: number; time: number; pointerType: string } | null>(null)
  const isMountedRef = useRef(true)

  useFrame((state) => {
    if (!isMountedRef.current) return
    
    if (groupRef.current) {
      groupRef.current.rotation.y = rotationY + Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
    if (modelGroupRef.current) {
      modelGroupRef.current.scale.setScalar(scale)
    }
  })

  // Очистка при размонтировании
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (typeof document !== 'undefined') {
        document.body.style.cursor = ''
      }
    }
  }, [])

  // Сохраняем физический коллайдер для столкновений, но интерактивность переносим на реальные меши модели
  const hitboxSize = Math.max(2.5, 2.5 * scale)
  const colliderSize = hitboxSize * 0.5 // половина размера хитбокса для коллидера

  // Статичные коллайдеры: используем useMemo для гарантии, что коллайдер никогда не удаляется
  const colliderArgs = useMemo(() => [colliderSize, colliderSize, colliderSize] as [number, number, number], [colliderSize])
  const colliderPosition = useMemo(() => [0, 1 * scale, 0] as [number, number, number], [scale])
  const isHovered = isMobile ? isMobileSelected : (isCenterHovered || localHovered)

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (typeof document !== 'undefined' && document.pointerLockElement === gl.domElement && e.pointerType !== 'touch') {
      return
    }
    if (typeof e.clientX === 'number' && typeof e.clientY === 'number' && typeof performance !== 'undefined' && performance.now) {
      pointerStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: performance.now(),
        pointerType: e.pointerType || 'mouse',
      }
    }
  }, [gl.domElement])

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (isMobile) return
    if (typeof document !== 'undefined' && document.pointerLockElement === gl.domElement && e.pointerType !== 'touch') {
      return
    }
    const start = pointerStartRef.current
    pointerStartRef.current = null
    if (!start) return

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const dt = (typeof performance !== 'undefined' && performance.now) ? performance.now() - start.time : 0

    if (start.pointerType === 'touch' || e.pointerType === 'touch') {
      const MAX_TAP_DURATION = 220
      const MAX_TAP_MOVE = 28
      if (dt <= MAX_TAP_DURATION && distance <= MAX_TAP_MOVE) {
        if (isMobile) {
          if (isMobileSelected) {
            if (isMountedRef.current) onClick()
          } else {
            onMobileSelect()
            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
              navigator.vibrate(50)
            }
          }
          return
        }
        if (typeof document !== 'undefined' && document.pointerLockElement) {
          document.exitPointerLock()
        }
        if (isMountedRef.current) onClick()
      }
      return
    }

    // Desktop: считаем это кликом только при минимальном смещении курсора
    const MAX_CLICK_MOVE = 5
    if (distance <= MAX_CLICK_MOVE && isMountedRef.current) {
      if (typeof document !== 'undefined' && document.pointerLockElement) {
        document.exitPointerLock()
      }
      onClick()
    }
  }, [gl.domElement, isMobile, isMobileSelected, onClick, onMobileSelect])

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (isMobile) return
    if (typeof document !== 'undefined' && document.pointerLockElement === gl.domElement) return
    setLocalHovered(true)
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'pointer'
    }
  }, [gl.domElement, isMobile])

  const handlePointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (isMobile) return
    setLocalHovered(false)
    if (typeof document !== 'undefined') {
      document.body.style.cursor = ''
    }
  }, [isMobile])

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      {/* Физический коллидер для экспоната - всегда рендерится, никогда не удаляется */}
      <RigidBody type="fixed" friction={0}>
        <CuboidCollider args={colliderArgs} position={colliderPosition} />
      </RigidBody>

      <group ref={modelGroupRef} scale={scale}>
        {exhibit.has3DModel && exhibit.modelPath ? (
          <Suspense
            fallback={
              <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#9ca3af" />
              </mesh>
            }
          >
            <ModelErrorBoundary
              key={`${exhibit.id}-${exhibit.modelPath}`}
              modelPath={exhibit.modelPath}
              fallback={
                <mesh>
                  <boxGeometry args={[1, 1, 1]} />
                  <meshStandardMaterial color="#9ca3af" />
                </mesh>
              }
            >
              <SafeModelWrapper
                modelPath={exhibit.modelPath}
                interactionId={exhibit.id}
                isHovered={isHovered}
                emissiveColor="#ffe8b8"
                emissiveIntensity={0}
                onPointerDown={isMobile ? undefined : handlePointerDown}
                onPointerUp={isMobile ? undefined : handlePointerUp}
                onPointerOver={isMobile ? undefined : handlePointerOver}
                onPointerOut={isMobile ? undefined : handlePointerOut}
                isMobile={isMobile}
                isSelected={isMobileSelected}
              />
            </ModelErrorBoundary>
          </Suspense>
        ) : (
          <mesh
            onPointerDown={isMobile ? undefined : handlePointerDown}
            onPointerUp={isMobile ? undefined : handlePointerUp}
            onPointerOver={isMobile ? undefined : handlePointerOver}
            onPointerOut={isMobile ? undefined : handlePointerOut}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#9ca3af" emissive="#ffe8b8" emissiveIntensity={isHovered ? 0.18 : 0} />
          </mesh>
        )}
      </group>

      {/* Индивидуальная подсветка экспоната + простая геометрия светильника */}
      <group position={[0, 2.65, 0]}>
        <mesh position={[0, 0.18, 0.42]} castShadow={!isMobile}>
          <cylinderGeometry args={[0.08, 0.08, 0.14, 16]} />
          <meshStandardMaterial color="#c6ad73" roughness={0.35} metalness={0.45} />
        </mesh>
        <mesh position={[0, 0.02, 0.32]} castShadow={!isMobile}>
          <coneGeometry args={[0.16, 0.24, 16]} />
          <meshStandardMaterial color="#bda66f" roughness={0.42} metalness={0.35} />
        </mesh>
        <spotLight
          position={[0, 0.16, 0.34]}
          target-position={[0, -1.2, 0]}
          intensity={isMobile ? 0.55 : 0.95}
          angle={0.34}
          penumbra={0.88}
          distance={7}
          decay={2}
          color="#fff1dc"
          castShadow={!isMobile}
          shadow-bias={-0.0002}
          shadow-mapSize-width={isMobile ? 256 : 512}
          shadow-mapSize-height={isMobile ? 256 : 512}
        />
      </group>

      {isHovered && (
        <Html 
          position={[0, 2.2, 0]} 
          center
          occlude
          distanceFactor={8}
          scale={0.25}
          style={{ zIndex: 15, pointerEvents: 'none' }}
          transform
        >
          <div
            className="text-white px-3 py-1.5 shadow-lg pointer-events-none"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
            }}
          >
            <div
              className="font-medium leading-tight mb-0.5 max-w-[180px] truncate"
              style={{ fontSize: '48px', lineHeight: 1.05 }}
            >
              {exhibit.title}
            </div>
            <div style={{ fontSize: '40px', lineHeight: 1, opacity: 0.72 }}>
              Кликните для просмотра
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения для React.memo
  // Перерендериваем только если изменились критичные пропсы
  return (
    prevProps.exhibit.id === nextProps.exhibit.id &&
    prevProps.position[0] === nextProps.position[0] &&
    prevProps.position[1] === nextProps.position[1] &&
    prevProps.position[2] === nextProps.position[2] &&
    prevProps.scale === nextProps.scale &&
    prevProps.rotationY === nextProps.rotationY &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.isCenterHovered === nextProps.isCenterHovered &&
    prevProps.isMobileSelected === nextProps.isMobileSelected
    // onClick не сравниваем, так как это функция и она может меняться
  )
})

function GalleryFloor({
  isMobile,
  lowPerformanceMode,
  onBackgroundTap,
}: {
  isMobile: boolean
  lowPerformanceMode: boolean
  onBackgroundTap?: () => void
}) {
  const floorRef = useRef<THREE.Mesh>(null)
  const handleStopPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => e.stopPropagation(), [])
  const handleBackgroundPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (e.pointerType === 'touch') {
      onBackgroundTap?.()
    }
  }, [onBackgroundTap])

  return (
    <RigidBody type="fixed" friction={0}>
      <mesh
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onPointerDown={handleStopPointerDown}
        onPointerUp={handleBackgroundPointerUp}
      >
        <planeGeometry args={[50, 50, 40, 40]} />
        {isMobile || lowPerformanceMode ? (
          <meshStandardMaterial
            color="#101010"
            metalness={0.8}
            roughness={0.2}
            envMapIntensity={2.0}
          />
        ) : (
          <MeshReflectorMaterial
            mirror={0.5}
            blur={[400, 100]}
            resolution={1024}
            mixBlur={1}
            mixStrength={40}
            roughness={1}
            depthToBlurRatioBias={0.25}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#101010"
            metalness={0.5}
            dithering={true}
          />
        )}
      </mesh>
    </RigidBody>
  )
}

function GalleryWalls({
  isMobile,
  onBackgroundTap,
}: {
  isMobile: boolean
  onBackgroundTap?: () => void
}) {
  const wallHeight = 7
  const wallLength = 50
  const handleStopPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => e.stopPropagation(), [])
  const handleBackgroundPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (e.pointerType === 'touch') {
      onBackgroundTap?.()
    }
  }, [onBackgroundTap])
  const wallColor = '#e6dfd2' // теплый оттенок "яичная скорлупа"
  const wallAccentColor = '#d7cebf'
  const nicheInnerColor = '#d2c8b7'

  return (
    <group onPointerDown={handleStopPointerDown} onPointerUp={handleBackgroundPointerUp}>
      <RigidBody type="fixed" friction={0}>
        <mesh position={[0, wallHeight / 2, -25]} receiveShadow>
          <boxGeometry args={[wallLength, wallHeight, 0.5]} />
          <meshStandardMaterial 
            color={wallColor}
            roughness={0.8} 
            metalness={0.03} 
            envMapIntensity={0.9}
          />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" friction={0}>
        <mesh position={[-25, wallHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <boxGeometry args={[wallLength, wallHeight, 0.5]} />
          <meshStandardMaterial 
            color={wallColor} 
            roughness={0.8} 
            metalness={0.03} 
            envMapIntensity={0.9}
          />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" friction={0}>
        <mesh position={[25, wallHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <boxGeometry args={[wallLength, wallHeight, 0.5]} />
          <meshStandardMaterial 
            color={wallColor} 
            roughness={0.8} 
            metalness={0.03} 
            envMapIntensity={0.9}
          />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" friction={0}>
        <mesh position={[0, wallHeight / 2, 25]} receiveShadow>
          <boxGeometry args={[wallLength, wallHeight, 0.5]} />
          <meshStandardMaterial 
            color={wallColor} 
            roughness={0.8} 
            metalness={0.03} 
            envMapIntensity={0.9}
          />
        </mesh>
      </RigidBody>
      
      {[-25, 25].map((x) => (
        <RigidBody key={`plinth-x-${x}`} type="fixed" friction={0}>
          <mesh 
            position={[x, 0.35, 0]} 
            rotation={[0, Math.PI / 2, 0]} 
            receiveShadow
            renderOrder={2}
          >
            <boxGeometry args={[50, 0.6, 0.5]} />
            <meshStandardMaterial 
              color="#6b5d4f"
              roughness={0.5}
              metalness={0.1}
              polygonOffset={true}
              polygonOffsetFactor={2}
              polygonOffsetUnits={2}
            />
          </mesh>
        </RigidBody>
      ))}
      {[-25, 25].map((z) => (
        <RigidBody key={`plinth-z-${z}`} type="fixed" friction={0}>
          <mesh 
            position={[0, 0.35, z]} 
            receiveShadow
            renderOrder={2}
          >
            <boxGeometry args={[50, 0.6, 0.5]} />
            <meshStandardMaterial 
              color="#6b5d4f"
              roughness={0.5}
              metalness={0.1}
              polygonOffset={true}
              polygonOffsetFactor={2}
              polygonOffsetUnits={2}
            />
          </mesh>
        </RigidBody>
      ))}
      
      {[-25, 25].map((x) => (
        <mesh key={`cornice-x-${x}`} position={[x, 6.88, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <boxGeometry args={[50, 0.3, 0.35]} />
          <meshStandardMaterial 
            color="#c9a961"
            roughness={0.25}
            metalness={0.35}
          />
        </mesh>
      ))}
      {[-25, 25].map((z) => (
        <mesh key={`cornice-z-${z}`} position={[0, 6.88, z]} receiveShadow>
          <boxGeometry args={[50, 0.3, 0.35]} />
          <meshStandardMaterial 
            color="#c9a961"
            roughness={0.25}
            metalness={0.35}
          />
        </mesh>
      ))}
      
      {(isMobile ? [-10, 0, 10] : [-20, -10, 0, 10, 20]).map((x) => (
        <mesh key={`panel-x-${x}`} position={[x, 3.5, -24.75]} receiveShadow>
          <boxGeometry args={[8, 4, 0.1]} />
          <meshStandardMaterial 
            color="#e8e0d5"
            roughness={0.5}
            metalness={0.05}
          />
        </mesh>
      ))}
      {(isMobile ? [-10, 0, 10] : [-20, -10, 0, 10, 20]).map((z) => (
        <mesh key={`panel-z-${z}`} position={[-24.75, 3.5, z]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <boxGeometry args={[8, 4, 0.1]} />
          <meshStandardMaterial 
            color="#e8e0d5"
            roughness={0.5}
            metalness={0.05}
          />
        </mesh>
      ))}
      
      {!isMobile && ([-18, -8, 2, 12, 22].map((x) => (
        <group key={`frame-x-${x}`} position={[x, 5.5, -24.8]}>
          <mesh receiveShadow>
            <boxGeometry args={[3, 1.5, 0.15]} />
            <meshStandardMaterial 
              color="#8b7355"
              roughness={0.4}
              metalness={0.1}
            />
          </mesh>
          <mesh position={[0, 0, 0.08]}>
            <boxGeometry args={[2.6, 1.1, 0.05]} />
            <meshStandardMaterial 
              color="#d4c4b0"
              roughness={0.6}
              metalness={0.0}
            />
          </mesh>
        </group>
      )))}
      
      {(isMobile ? [3.5] : [1.5, 5.5]).map((y) => (
        <React.Fragment key={`molding-row-${y}`}>
          {[-25, 25].map((x) => (
            <mesh key={`molding-h-x-${x}-y-${y}`} position={[x, y, -24.9]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
              <boxGeometry args={[50, 0.05, 0.1]} />
              <meshStandardMaterial 
                color="#c9a961"
                roughness={0.3}
                metalness={0.4}
              />
            </mesh>
          ))}
          {[-25, 25].map((z) => (
            <mesh key={`molding-h-z-${z}-y-${y}`} position={[-24.9, y, z]} receiveShadow>
              <boxGeometry args={[50, 0.05, 0.1]} />
              <meshStandardMaterial 
                color="#c9a961"
                roughness={0.3}
                metalness={0.4}
              />
            </mesh>
          ))}
        </React.Fragment>
      ))}

      {/* Пилястры: легкие выступы создают глубину стен */}
      {(isMobile ? [-15, 0, 15] : [-20, -10, 0, 10, 20]).map((x) => (
        <mesh key={`pilaster-front-${x}`} position={[x, 3.4, -24.62]} receiveShadow>
          <boxGeometry args={[0.55, 5.8, 0.32]} />
          <meshStandardMaterial color={wallAccentColor} roughness={0.82} metalness={0.02} />
        </mesh>
      ))}
      {(isMobile ? [-15, 0, 15] : [-20, -10, 0, 10, 20]).map((x) => (
        <mesh key={`pilaster-back-${x}`} position={[x, 3.4, 24.62]} receiveShadow>
          <boxGeometry args={[0.55, 5.8, 0.32]} />
          <meshStandardMaterial color={wallAccentColor} roughness={0.82} metalness={0.02} />
        </mesh>
      ))}
      {(isMobile ? [-15, 0, 15] : [-20, -10, 0, 10, 20]).map((z) => (
        <mesh key={`pilaster-left-${z}`} position={[-24.62, 3.4, z]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <boxGeometry args={[0.55, 5.8, 0.32]} />
          <meshStandardMaterial color={wallAccentColor} roughness={0.82} metalness={0.02} />
        </mesh>
      ))}
      {(isMobile ? [-15, 0, 15] : [-20, -10, 0, 10, 20]).map((z) => (
        <mesh key={`pilaster-right-${z}`} position={[24.62, 3.4, z]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <boxGeometry args={[0.55, 5.8, 0.32]} />
          <meshStandardMaterial color={wallAccentColor} roughness={0.82} metalness={0.02} />
        </mesh>
      ))}

      {/* Ниши под экспонаты: контрастная вставка внутри стен */}
      {(isMobile ? [-10, 0, 10] : [-20, -10, 0, 10, 20]).map((x) => (
        <mesh key={`niche-front-${x}`} position={[x, 3.5, -24.92]} receiveShadow>
          <boxGeometry args={[6.4, 3.2, 0.08]} />
          <meshStandardMaterial color={nicheInnerColor} roughness={0.85} metalness={0.01} />
        </mesh>
      ))}
      {(isMobile ? [-10, 0, 10] : [-20, -10, 0, 10, 20]).map((z) => (
        <mesh key={`niche-left-${z}`} position={[-24.92, 3.5, z]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <boxGeometry args={[6.4, 3.2, 0.08]} />
          <meshStandardMaterial color={nicheInnerColor} roughness={0.85} metalness={0.01} />
        </mesh>
      ))}

      {/* Угловой полумрак: мягкое затухание в углах зала */}
      {!isMobile &&
        [
          [-22, -22],
          [-22, 22],
          [22, -22],
          [22, 22],
        ].map(([x, z], idx) => (
          <spotLight
            key={`corner-mood-${idx}`}
            position={[x, 6.4, z]}
            target-position={[x * 0.6, 1.2, z * 0.6]}
            intensity={0.28}
            angle={0.45}
            penumbra={0.9}
            distance={20}
            decay={2.2}
            color="#fff0d8"
          />
        ))}
    </group>
  )
}

function GalleryCeiling({
  isMobile,
  onBackgroundTap,
}: {
  isMobile: boolean
  onBackgroundTap?: () => void
}) {
  const handleStopPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => e.stopPropagation(), [])
  const handleBackgroundPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (e.pointerType === 'touch') {
      onBackgroundTap?.()
    }
  }, [onBackgroundTap])

  return (
    <group onPointerDown={handleStopPointerDown} onPointerUp={handleBackgroundPointerUp}>
      <mesh position={[0, 7, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50, 30, 30]} />
        <meshStandardMaterial 
          color="#e8e3d8"
          roughness={0.5} 
          metalness={0.02} 
          envMapIntensity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {[-25, 25].map((x) => (
        <mesh key={`molding-x-${x}`} position={[x, 6.95, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry args={[23, 24.5, 64]} />
          <meshStandardMaterial 
            color="#d4af37"
            roughness={0.2}
            metalness={0.4}
            emissive="#ffd86b"
            emissiveIntensity={2.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      
      <mesh position={[0, 6.97, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[2, 3, 32]} />
        <meshStandardMaterial 
          color="#c9a961"
          roughness={0.15}
          metalness={0.5}
          emissive="#ffd86b"
          emissiveIntensity={2.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {!isMobile && (
        [
          [-20, -20], [-20, 20], [20, -20], [20, 20]
        ].map(([x, z], idx) => (
          <mesh key={`corner-rosette-${idx}`} position={[x, 6.96, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <ringGeometry args={[1, 1.5, 24]} />
            <meshStandardMaterial 
              color="#c9a961"
              roughness={0.15}
              metalness={0.5}
              emissive="#ffd86b"
              emissiveIntensity={2.5}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))
      )}
      
      {!isMobile && (
        <>
          {[-20, 20].map((x) => (
            <mesh key={`side-rosette-x-${x}`} position={[x, 6.96, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <ringGeometry args={[1.2, 1.8, 24]} />
              <meshStandardMaterial 
                color="#c9a961"
                roughness={0.15}
                metalness={0.5}
                emissive="#ffd86b"
                emissiveIntensity={2.5}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
          {[-20, 20].map((z) => (
            <mesh key={`side-rosette-z-${z}`} position={[0, 6.96, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <ringGeometry args={[1.2, 1.8, 24]} />
              <meshStandardMaterial 
                color="#c9a961"
                roughness={0.15}
                metalness={0.5}
                emissive="#ffd86b"
                emissiveIntensity={2.5}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </>
      )}
    </group>
  )
}

// Мгновенная установка камеры на экспонат (без анимации). Возврат — плавный lerp/slerp.
function CameraController({ 
  targetPosition, 
  targetQuaternion,
  isFocusing, 
  onFocusComplete,
  onReturnComplete,
  savedPosition,
  savedQuaternion,
  setIsCameraReturning
}: { 
  targetPosition: [number, number, number] | null
  targetQuaternion: THREE.Quaternion | null
  isFocusing: boolean
  onFocusComplete: () => void
  onReturnComplete: () => void
  savedPosition: React.MutableRefObject<THREE.Vector3 | null>
  savedQuaternion: React.MutableRefObject<THREE.Quaternion | null>
  setIsCameraReturning: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const { camera } = useThree()
  const isReturning = useRef(false)
  const DAMP_SPEED = 8 // Скорость плавного возврата

  useFrame((state, delta) => {
    // Только возврат: плавный lerp обратно. Переход «к экспонату» делается в handleExhibitClick.
    if (isReturning.current && savedPosition.current && savedQuaternion.current) {
      // Проверка плавного UX (Возврат): логика возврата осталась нетронутой и использует lerp
      // Мы убираем пролет ТОЛЬКО "туда" (к модели), возврат остается плавным
      // Возврат камеры в исходную позицию и поворот
      const smoothFactor = 1 - Math.exp(-DAMP_SPEED * delta)
      camera.position.lerp(savedPosition.current, smoothFactor)
      camera.quaternion.slerp(savedQuaternion.current, smoothFactor)
      
      // Проверяем завершение возврата по позиции и углу поворота
      const positionDistance = camera.position.distanceTo(savedPosition.current)
      const quaternionAngle = camera.quaternion.angleTo(savedQuaternion.current)
      
      if (positionDistance < 0.01 && quaternionAngle < 0.01) {
        // Финальная установка позиции и поворота камеры
        camera.position.copy(savedPosition.current)
        camera.quaternion.copy(savedQuaternion.current)
        
        isReturning.current = false
        // Камера закончила движение - вызываем callback для создания RigidBody
        onReturnComplete()
      }
    }
  })

  // Запускаем возврат камеры когда фокус завершен и Overlay закрыт
  useEffect(() => {
    if (!isFocusing && savedPosition.current && savedQuaternion.current && !isReturning.current) {
      // Запускаем возврат только если есть сохраненные данные
      console.log('Target return position:', savedPosition.current)
      console.log('Target return quaternion:', savedQuaternion.current)
      isReturning.current = true
      // Устранение предупреждения "Cannot update a component while rendering":
      // Обертываем setState в setTimeout, чтобы React успел закончить текущий цикл отрисовки
      setTimeout(() => {
        setIsCameraReturning(true)
      }, 0)
    }
  }, [isFocusing, savedPosition, savedQuaternion, setIsCameraReturning])

  return null
}

function CameraRefSync({ cameraRef }: { cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null> }) {
  const { camera } = useThree()
  useEffect(() => {
    cameraRef.current = camera as THREE.PerspectiveCamera
    return () => {
      cameraRef.current = null
    }
  }, [camera, cameraRef])
  return null
}

function CameraBounds({ 
  isOrbitMode, 
  isMobile, 
  isFocusing 
}: { 
  isOrbitMode: boolean
  isMobile: boolean
  isFocusing?: boolean
}) {
  const { camera } = useThree()
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useFrame(() => {
    if (!isMountedRef.current) return
    
    // Не ограничиваем камеру при фокусе на экспонате или в orbit режиме
    if (isOrbitMode || isMobile || isFocusing) return
    
    camera.position.x = Math.max(
      GALLERY_BOUNDS.minX + 1,
      Math.min(GALLERY_BOUNDS.maxX - 1, camera.position.x)
    )
    camera.position.z = Math.max(
      GALLERY_BOUNDS.minZ + 1,
      Math.min(GALLERY_BOUNDS.maxZ - 1, camera.position.z)
    )
    camera.position.y = Math.max(
      GALLERY_BOUNDS.minY,
      Math.min(GALLERY_BOUNDS.maxY, camera.position.y)
    )
  })
  return null
}

export default function VirtualGallery({ exhibits }: VirtualGalleryProps) {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [lowPerformanceMode, setLowPerformanceMode] = useState(false)
  const [dynamicShadows, setDynamicShadows] = useState(true)
  const [selectedExhibitForInfo, setSelectedExhibitForInfo] = useState<Exhibit | null>(null)
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)
  
  // Сохранение позиции камеры для возврата
  const savedCameraPosition = useRef<THREE.Vector3 | null>(null)
  const savedCameraQuaternion = useRef<THREE.Quaternion | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const [isCameraReturning, setIsCameraReturning] = useState(false)
  // Стартовый экран: состояние для получения пользовательского жеста
  const [hasStarted, setHasStarted] = useState(false)
  const [isExploring, setIsExploring] = useState(false) // Режим ходьбы: есть RigidBody (начинаем с false)
  const [initialPlayerPosition, setInitialPlayerPosition] = useState<THREE.Vector3>(() => DEFAULT_SPAWN_POSITION.clone())
  const [initialPlayerQuaternion, setInitialPlayerQuaternion] = useState<THREE.Quaternion>(new THREE.Quaternion())
  const [playerKey, setPlayerKey] = useState(0) // Key для управления жизненным циклом FirstPersonControls
  const [isSceneReady, setIsSceneReady] = useState(false)
  const [centerHoveredExhibitId, setCenterHoveredExhibitId] = useState<string | null>(null)
  const [mobileSelectedId, setMobileSelectedId] = useState<string | null>(null)
  const mobileMoveVectorRef = useRef({ x: 0, y: 0, active: false })
  const mobileLookDeltaRef = useRef({ x: 0, y: 0 })
  const mobileLookActiveRef = useRef(false)
  const mobileLookTouchIdRef = useRef<number | null>(null)
  const mobileLookGestureTimeRef = useRef(0)
  const mobileTapSuppressionUntilRef = useRef(0)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth < 768 ||
          ('ontouchstart' in window) ||
          navigator.maxTouchPoints > 0
      )
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => {
      window.removeEventListener('resize', checkMobile)
      // Очистка при размонтировании
      setIsMobile(false)
      setCanvasElement(null)
      // Очистка Canvas WebGL контекста (если расширение поддерживается)
      if (canvasRef.current) {
        try {
          const gl = canvasRef.current.getContext('webgl') || canvasRef.current.getContext('webgl2')
          if (gl) {
            const loseContext = (gl as any).getExtension?.('WEBGL_lose_context')
            if (loseContext && loseContext.loseContext) {
              loseContext.loseContext()
            }
          }
        } catch (error) {
          // Расширение не поддерживается - это нормально, основная очистка через dispose()
        }
        canvasRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isSceneReady) return
    // Авто-включение режима исследования после полной загрузки сцены
    setIsExploring(true)
  }, [isSceneReady])

  useEffect(() => {
    if (!isMobile || !isExploring || selectedExhibitForInfo) {
      setMobileSelectedId(null)
    }
  }, [isMobile, isExploring, selectedExhibitForInfo])

  const exhibitData = useMemo(() => {
    if (!exhibits || !Array.isArray(exhibits)) {
      return []
    }
    const visibleExhibits = exhibits.filter(
      (ex) => ex && ex.visibleInGallery !== false && (ex.isPublic !== false)
    )
    const spacing = 6
    const rows = Math.ceil(Math.sqrt(visibleExhibits.length))
    let autoIndex = 0

    return visibleExhibits.map((exhibit) => {
      let pos: [number, number, number]
      
      if (
        exhibit.galleryPositionX !== undefined &&
        exhibit.galleryPositionY !== undefined &&
        exhibit.galleryPositionZ !== undefined
      ) {
        pos = [
          Math.max(GALLERY_BOUNDS.minX, Math.min(GALLERY_BOUNDS.maxX, exhibit.galleryPositionX)),
          Math.max(GALLERY_BOUNDS.minY, Math.min(GALLERY_BOUNDS.maxY, exhibit.galleryPositionY)),
          Math.max(GALLERY_BOUNDS.minZ, Math.min(GALLERY_BOUNDS.maxZ, exhibit.galleryPositionZ)),
        ]
      } else {
        const row = Math.floor(autoIndex / rows)
        const col = autoIndex % rows
        const x = Math.max(GALLERY_BOUNDS.minX, Math.min(GALLERY_BOUNDS.maxX, (col - (rows - 1) / 2) * spacing))
        const z = Math.max(GALLERY_BOUNDS.minZ, Math.min(GALLERY_BOUNDS.maxZ, -row * spacing - 5))
        autoIndex++
        pos = [x, 0, z]
      }
      
      return {
        exhibit,
        position: pos,
        scale: exhibit.galleryScale ?? 1.0,
        rotationY: exhibit.galleryRotationY ?? 0,
      }
    })
  }, [exhibits])

  // Позиция целевого экспоната для фокуса камеры
  const [focusTarget, setFocusTarget] = useState<[number, number, number] | null>(null)
  const [focusQuaternion, setFocusQuaternion] = useState<THREE.Quaternion | null>(null) // Кватернион для направления взгляда
  const [isCameraFocusing, setIsCameraFocusing] = useState(false)

  const handleExhibitClick = useCallback(
    (exhibitId: string, exhibitPosition: [number, number, number], exhibitScale: number) => {
      if (!exhibitId || typeof exhibitId !== 'string') {
        console.warn('Invalid exhibit ID:', exhibitId)
        return
      }
      
      const exhibit = exhibits.find((ex) => ex.id === exhibitId)
      if (!exhibit) {
        console.warn('Exhibit not found:', exhibitId)
        return
      }

      if (typeof document !== 'undefined' && document.pointerLockElement) {
        document.exitPointerLock()
      }

      const targetVec = new THREE.Vector3(...exhibitPosition)
      const offset = new THREE.Vector3(0, 1.5, 4)
      const finalCameraPosition = targetVec.clone().add(offset)
      const direction = targetVec.clone().sub(finalCameraPosition).normalize()
      const finalQuaternion = new THREE.Quaternion()
      finalQuaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction)

      // Мгновенная установка камеры ДО любых setState (0 кадров, без Tween)
      if (cameraRef.current) {
        savedCameraPosition.current = cameraRef.current.position.clone()
        savedCameraQuaternion.current = cameraRef.current.quaternion.clone()
        cameraRef.current.position.copy(finalCameraPosition)
        cameraRef.current.quaternion.copy(finalQuaternion)
        cameraRef.current.updateMatrixWorld(true)
      }

      setSelectedExhibitForInfo(exhibit)
      setMobileSelectedId(null)
      setIsExploring(false)
      setIsOverlayOpen(true)
      setFocusTarget([finalCameraPosition.x, finalCameraPosition.y, finalCameraPosition.z] as [number, number, number])
      setFocusQuaternion(finalQuaternion)
      setIsCameraFocusing(true)
    },
    [exhibits]
  )

  const handleCenterActivate = useCallback((exhibitId: string) => {
    const target = exhibitData.find((item) => item.exhibit.id === exhibitId)
    if (!target) return
    handleExhibitClick(exhibitId, target.position, target.scale)
  }, [exhibitData, handleExhibitClick])

  const handleMobileTapExhibit = useCallback((exhibitId: string) => {
    const target = exhibitData.find((item) => item.exhibit.id === exhibitId)
    if (!target) return

    if (mobileSelectedId === exhibitId) {
      handleExhibitClick(exhibitId, target.position, target.scale)
      return
    }

    setMobileSelectedId(exhibitId)
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(50)
    }
  }, [exhibitData, handleExhibitClick, mobileSelectedId])

  const handleCloseOverlay = useCallback(() => {
    // Полная очистка: сначала selectedExhibitForInfo = null, потом камера прилетает, потом создается RigidBody
    setIsOverlayOpen(false)
    setIsCameraFocusing(false)
    setFocusTarget(null)
    setFocusQuaternion(null) // Очищаем кватернион
    // Сначала: установи selectedExhibitForInfo = null (это разблокирует создание RigidBody)
    setSelectedExhibitForInfo(null)
    // Возврат камеры будет обработан в CameraController
  }, [])

  const handleFocusComplete = useCallback(() => {
    setIsCameraFocusing(false)
  }, [])

  // Устранение "залипания" ESC: синхронизация состояния при разблокировке PointerLock
  const handlePointerLockUnlock = useCallback(() => {
    // Когда игрок нажимает ESC, состояние isExploring должно синхронизироваться
    // чтобы не возникало ситуации, когда курсор виден, а игра думает, что ты еще "внутри"
    if (isExploring && !selectedExhibitForInfo && !isCameraReturning) {
      // Если мы в режиме исследования и нет активного Overlay, синхронизируем состояние
      // Это предотвращает "залипание" управления
    }
  }, [isExploring, selectedExhibitForInfo, isCameraReturning])

  const handleReturnComplete = useCallback(() => {
    // Логика возрождения: камера закончила движение, создаем RigidBody в точке финиша
    // Изменяем порядок: передаем позицию напрямую из savedCameraPosition.current
    if (savedCameraPosition.current) {
      // Клонирование данных: делаем глубокое клонирование
      const spawnPos = savedCameraPosition.current.clone()
      // Коррекция Y-высоты: уменьшаем добавку с 0.1 до 0.05, чтобы персонаж не "подпрыгивал"
      spawnPos.y += 0.05 // запас высоты
      
      // Устанавливаем начальную позицию для нового RigidBody
      setInitialPlayerPosition(spawnPos)
      // Логика возврата: setInitialPlayerQuaternion вызывается до изменения playerKey
      // Передача вращения (Quaternion): сохраняем направление взгляда
      if (savedCameraQuaternion.current) {
        const quaternionToApply = savedCameraQuaternion.current.clone()
        setInitialPlayerQuaternion(quaternionToApply)
        // Лог прямо перед setPlayerKey для отладки
        console.log('APPLYING ROTATION:', quaternionToApply)
      }
      // Force Remount: изменяем key для полного пересоздания компонента
      const newKey = playerKey + 1
      setPlayerKey(newKey)
      
      // Проверка в VirtualGallery: логирование для отладки
      console.log('DEBUG: Setting Player Key to', newKey, 'with pos', spawnPos)
      
      // Включаем режим ходьбы - RigidBody будет создан (самым последним, после изменения позиции и ключа)
      setIsExploring(true)
      
      // НЕ очищаем savedCameraPosition.current сразу - он нужен как fallback в JSX
      // Очистим его после того, как компонент точно получит позицию
      setTimeout(() => {
        savedCameraPosition.current = null
        savedCameraQuaternion.current = null
      }, 100)
    }
    // Устранение предупреждения "Cannot update a component while rendering":
    // Обертываем setState в setTimeout, чтобы React успел закончить текущий цикл отрисовки
    setTimeout(() => {
      // Завершаем возврат камеры
      setIsCameraReturning(false)
    }, 0)
  }, [playerKey])


  const handleMobileJoystickChange = useCallback((vector: { x: number; y: number; active: boolean }) => {
    mobileMoveVectorRef.current.x = vector.x
    mobileMoveVectorRef.current.y = vector.y
    mobileMoveVectorRef.current.active = vector.active
  }, [])

  const handleMobileLook = useCallback((deltaX: number, deltaY: number) => {
    mobileLookDeltaRef.current.x += deltaX
    mobileLookDeltaRef.current.y += deltaY
  }, [])

  const controlsMode = 'firstperson' as const

  return (
    <div 
      ref={canvasContainerRef}
      className={`relative w-full ${isMobile ? 'h-[calc(100vh-6rem)]' : 'h-screen'} bg-gradient-to-b from-stone-50 via-amber-50/20 to-stone-50`}
    >
      {!isMobile && hasStarted && isExploring && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="w-2.5 h-2.5 border border-white/80 rounded-full bg-white/20"></div>
        </div>
      )}

      {isMobile && controlsMode === 'firstperson' && (
        <>
          <MobileJoystick onVectorChange={handleMobileJoystickChange} />
          <MobileControls
            onLook={handleMobileLook}
            canvasElement={canvasElement}
            lookActiveRef={mobileLookActiveRef}
            lookTouchIdExternalRef={mobileLookTouchIdRef}
            lookGestureTimeRef={mobileLookGestureTimeRef}
            tapSuppressionUntilRef={mobileTapSuppressionUntilRef}
          />
        </>
      )}


      <Canvas
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        shadows={!isMobile && dynamicShadows}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        performance={{ min: isMobile ? 0.3 : 0.5, max: 1 }}
        style={{ width: '100%', height: '100%', touchAction: 'none', pointerEvents: 'auto' }}
        frameloop="always"
        onPointerMissed={(event) => {
          if (!isMobile) return
          if (event.type === 'pointerup') {
            setMobileSelectedId(null)
          }
        }}
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement
          setCanvasElement(gl.domElement)
          if (isMobile) {
            gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
            gl.shadowMap.enabled = false
          }
        }}
      >
        <SceneReadyController onReady={() => setIsSceneReady(true)} />
        <PerformanceQualityController
          isMobile={isMobile}
          setLowPerformanceMode={setLowPerformanceMode}
          setDynamicShadows={setDynamicShadows}
        />
        <CanvasLoader />
        <Suspense fallback={null}>
          <ambientLight intensity={isMobile ? 0.5 : 0.35} color="#fff8e1" />
          <directionalLight
            position={[10, 10, 5]}
            intensity={isMobile ? 0.8 : 1.2}
            castShadow={!isMobile && dynamicShadows}
            shadow-mapSize-width={isMobile ? 512 : 2048}
            shadow-mapSize-height={isMobile ? 512 : 2048}
            shadow-camera-far={50}
            shadow-camera-left={-25}
            shadow-camera-right={25}
            shadow-camera-top={25}
            shadow-camera-bottom={-25}
            color="#fff8e1"
          />
          {!isMobile && (
            <directionalLight position={[-10, 8, -5]} intensity={0.6} color="#fff8e1" />
          )}
          {!isMobile && (
            <>
              <pointLight position={[0, 6.3, 0]} intensity={2.5} distance={42} decay={2} color="#fff8e1" />
              <pointLight position={[-20, 5.5, -20]} intensity={0.9} distance={32} decay={2} color="#fff8e1" />
              <pointLight position={[20, 5.5, -20]} intensity={0.9} distance={32} decay={2} color="#fff8e1" />
              <pointLight position={[-20, 5.5, 20]} intensity={0.9} distance={32} decay={2} color="#fff8e1" />
              <pointLight position={[20, 5.5, 20]} intensity={0.9} distance={32} decay={2} color="#fff8e1" />
              <spotLight 
                position={[0, 5, 0]} 
                angle={Math.PI / 2.2} 
                penumbra={0.7} 
                intensity={2.0} 
                distance={48} 
                decay={2} 
                color="#fff8e1"
                castShadow={dynamicShadows}
              />
              <pointLight position={[0, 4.5, -15]} intensity={0.5} distance={28} decay={2} color="#fff8e1" />
              <pointLight position={[0, 4.5, 15]} intensity={0.5} distance={28} decay={2} color="#fff8e1" />
            </>
          )}
          {/* TODO(low-priority): заменить preset на кастомный HDR из public/, если появится .hdr файл */}
          <Environment preset="city" resolution={isMobile ? 128 : 256} />

          <PostProcessingEffects isMobile={isMobile} />
          <CenterRaycastInteraction
            enabled={!isMobile && isExploring && !selectedExhibitForInfo && !isCameraReturning}
            onActivate={handleCenterActivate}
            onHoverChange={setCenterHoveredExhibitId}
          />
          <MobileTouchInteraction
            enabled={isMobile && isExploring && !selectedExhibitForInfo && !isCameraReturning}
            onTapExhibit={handleMobileTapExhibit}
            onTapEmpty={() => setMobileSelectedId(null)}
            lookActiveRef={mobileLookActiveRef}
            lookTouchIdRef={mobileLookTouchIdRef}
            lookGestureTimeRef={mobileLookGestureTimeRef}
            tapSuppressionUntilRef={mobileTapSuppressionUntilRef}
          />

          <PerspectiveCamera makeDefault position={[0, 2, 10]} fov={75} />
          <CameraRefSync cameraRef={cameraRef} />

          {/* Отключение камеры: CameraController и FirstPersonControls не должны существовать одновременно */}
          {!isExploring && (
            <CameraController
              targetPosition={focusTarget}
              targetQuaternion={focusQuaternion}
              isFocusing={isCameraFocusing}
              onFocusComplete={handleFocusComplete}
              onReturnComplete={handleReturnComplete}
              savedPosition={savedCameraPosition}
              savedQuaternion={savedCameraQuaternion}
              setIsCameraReturning={setIsCameraReturning}
            />
          )}

          <CameraBounds 
            isOrbitMode={false} 
            isMobile={isMobile} 
            isFocusing={isCameraFocusing}
          />

          <Physics gravity={[0, -9.81, 0]}>
            <Suspense fallback={null}>
              <GalleryFloor
                isMobile={isMobile}
                lowPerformanceMode={lowPerformanceMode}
                onBackgroundTap={() => setMobileSelectedId(null)}
              />
              <GalleryWalls isMobile={isMobile} onBackgroundTap={() => setMobileSelectedId(null)} />
              <GalleryCeiling isMobile={isMobile} onBackgroundTap={() => setMobileSelectedId(null)} />
            </Suspense>

            <Suspense fallback={null}>
              {exhibitData.map(({ exhibit, position, scale, rotationY }) => (
                <ExhibitInSpace
                  key={exhibit.id}
                  exhibit={exhibit}
                  position={position}
                  scale={scale}
                  rotationY={rotationY}
                  onClick={() => handleExhibitClick(exhibit.id, position, scale)}
                  onMobileSelect={() => setMobileSelectedId(exhibit.id)}
                  isMobile={isMobile}
                  isCenterHovered={centerHoveredExhibitId === exhibit.id}
                  isMobileSelected={mobileSelectedId === exhibit.id}
                />
              ))}
            </Suspense>

            {controlsMode === 'firstperson' && isExploring && (
              <FirstPersonControls
                key={playerKey}
                mobileMoveVectorRef={isMobile ? mobileMoveVectorRef : undefined}
                mobileLookDeltaRef={isMobile ? mobileLookDeltaRef : undefined}
                bounds={isMobile ? undefined : GALLERY_BOUNDS}
                enabled={!isCameraReturning}
                isLocked={!!selectedExhibitForInfo || isCameraReturning}
                initialPosition={initialPlayerPosition || savedCameraPosition.current || DEFAULT_SPAWN_POSITION}
                initialQuaternion={initialPlayerQuaternion}
                onPointerLockUnlock={handlePointerLockUnlock}
              />
            )}
          </Physics>
        </Suspense>
      </Canvas>

      {/* Overlay с информацией об экспонате (включает размытие фона) */}
      {isOverlayOpen && selectedExhibitForInfo && (
        <ExhibitOverlay 
          exhibit={selectedExhibitForInfo} 
          onClose={handleCloseOverlay}
        />
      )}

      {/* Стартовый экран: кнопка "Начать экскурсию" для получения пользовательского жеста */}
      {!hasStarted && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 1000,
            cursor: isSceneReady ? 'pointer' : 'default'
          }}
        >
          <button
            style={{
              padding: '20px 40px',
              fontSize: '24px',
              backgroundColor: isSceneReady ? '#fff8e1' : '#9ca3af',
              color: '#1a1a1a',
              border: 'none',
              borderRadius: '8px',
              cursor: isSceneReady ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              transition: 'transform 0.2s',
              opacity: isSceneReady ? 1 : 0.85,
            }}
            disabled={!isSceneReady}
            onClick={() => {
              if (!isSceneReady) return
              setHasStarted(true)
              setIsExploring(true)
              if (canvasRef.current && document.pointerLockElement !== canvasRef.current) {
                canvasRef.current.requestPointerLock().catch(() => {
                  // Браузер может отклонить pointer lock — это нормально, пользователь сможет кликнуть по сцене
                })
              }
            }}
            onMouseEnter={(e) => {
              if (isSceneReady) {
                e.currentTarget.style.transform = 'scale(1.05)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {isSceneReady ? 'Войти в галерею' : 'Загрузка сцены...'}
          </button>
        </div>
      )}
    </div>
  )
}
