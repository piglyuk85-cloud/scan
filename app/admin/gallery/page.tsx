'use client'

import React, { useState, useEffect, useRef, useCallback, Suspense, createContext, useContext } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Environment, TransformControls, Grid } from '@react-three/drei'
import { EffectComposer, Outline, Selection, Select } from '@react-three/postprocessing'
import * as THREE from 'three'
import { Exhibit } from '@/types/exhibit'
import SafeModelWrapper from '@/components/SafeModel'

// Контекст для авто-фокуса камеры и настроек редактора
type FocusTarget = [number, number, number] | null
const EditorGalleryContext = createContext<{
  focusTarget: FocusTarget
  setFocusTarget: (v: FocusTarget) => void
  gridSnap: boolean
} | null>(null)

function useEditorGallery() {
  const ctx = useContext(EditorGalleryContext)
  return ctx
}

// Константы границ галереи
const GALLERY_BOUNDS = {
  minX: -24,
  maxX: 24,
  minZ: -24,
  maxZ: 24,
  minY: 0,
  maxY: 7,
}

// Компонент для управления камерой через WASD в редакторе
function EditorCameraControls({ 
  bounds, 
  isDragging 
}: { 
  bounds: typeof GALLERY_BOUNDS
  isDragging: boolean
}) {
  const { camera, gl } = useThree()
  const editorCtx = useEditorGallery()
  const focusTarget = editorCtx?.focusTarget ?? null
  const setFocusTarget = editorCtx?.setFocusTarget ?? (() => {})

  const moveForward = useRef(false)
  const moveBackward = useRef(false)
  const moveLeft = useRef(false)
  const moveRight = useRef(false)
  const moveUp = useRef(false)
  const moveDown = useRef(false)
  const moveVector = useRef(new THREE.Vector3())
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const isRightMouseDown = useRef(false)
  const isMiddleMouseDown = useRef(false)
  const lastMouseX = useRef(0)
  const lastMouseY = useRef(0)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Игнорируем если фокус на input/textarea/select
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return
      }

      switch (event.code) {
        case 'KeyW':
          moveForward.current = true
          break
        case 'KeyS':
          moveBackward.current = true
          break
        case 'KeyA':
          moveLeft.current = true
          break
        case 'KeyD':
          moveRight.current = true
          break
        case 'KeyQ':
        case 'Space':
          event.preventDefault()
          moveUp.current = true
          break
        case 'KeyE':
          event.preventDefault()
          moveDown.current = true
          break
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          moveForward.current = false
          break
        case 'KeyS':
          moveBackward.current = false
          break
        case 'KeyA':
          moveLeft.current = false
          break
        case 'KeyD':
          moveRight.current = false
          break
        case 'KeyQ':
        case 'Space':
          moveUp.current = false
          break
        case 'KeyE':
          moveDown.current = false
          break
      }
    }

    // Управление мышью для камеры
    const handleMouseDown = (event: MouseEvent) => {
      // Не обрабатываем, если перетаскиваем экспонат
      if (isDragging) return
      
      if (event.button === 1) { // Средняя кнопка мыши - панорамирование
        event.preventDefault()
        isMiddleMouseDown.current = true
        lastMouseX.current = event.clientX
        lastMouseY.current = event.clientY
        gl.domElement.style.cursor = 'move'
      } else if (event.button === 2) { // Правая кнопка мыши - вращение камеры
        event.preventDefault()
        isRightMouseDown.current = true
        lastMouseX.current = event.clientX
        lastMouseY.current = event.clientY
        gl.domElement.style.cursor = 'grab'
      }
    }

    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 1) {
        isMiddleMouseDown.current = false
        gl.domElement.style.cursor = 'default'
      } else if (event.button === 2) {
        isRightMouseDown.current = false
        gl.domElement.style.cursor = 'default'
      }
    }

    const handleMouseMove = (event: MouseEvent) => {
      // Управляем камерой независимо от перетаскивания экспоната
      // Перетаскивание экспоната обрабатывается через pointer events, а не mouse events
      
      if (isRightMouseDown.current) {
        // Вращение камеры правой кнопкой мыши
        const deltaX = event.clientX - lastMouseX.current
        const deltaY = event.clientY - lastMouseY.current

        euler.current.setFromQuaternion(camera.quaternion)
        euler.current.y -= deltaX * 0.003
        euler.current.x -= deltaY * 0.003
        euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x))
        camera.quaternion.setFromEuler(euler.current)

        lastMouseX.current = event.clientX
        lastMouseY.current = event.clientY
      } else if (isMiddleMouseDown.current) {
        // Панорамирование средней кнопкой мыши
        const deltaX = event.clientX - lastMouseX.current
        const deltaY = event.clientY - lastMouseY.current

        // Движение камеры влево/вправо и вверх/вниз
        moveVector.current.setFromMatrixColumn(camera.matrix, 0)
        moveVector.current.multiplyScalar(-deltaX * 0.01)
        camera.position.add(moveVector.current)

        moveVector.current.set(0, deltaY * 0.01, 0)
        camera.position.add(moveVector.current)

        // Ограничиваем позицию камеры границами помещения
        camera.position.x = Math.max(
          bounds.minX + 1,
          Math.min(bounds.maxX - 1, camera.position.x)
        )
        camera.position.z = Math.max(
          bounds.minZ + 1,
          Math.min(bounds.maxZ - 1, camera.position.z)
        )
        camera.position.y = Math.max(
          bounds.minY,
          Math.min(bounds.maxY, camera.position.y)
        )

        lastMouseX.current = event.clientX
        lastMouseY.current = event.clientY
      }
    }
    
    // Блокируем контекстное меню при правой кнопке мыши
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault()
    }

    const handleWheel = (event: WheelEvent) => {
      // Масштабирование камеры (приближение/отдаление)
      if (isDragging) return // Не зумим во время перетаскивания
      
      event.preventDefault()
      const zoomSpeed = 2.0
      const direction = event.deltaY > 0 ? 1 : -1
      
      // Движение камеры вперед/назад для эффекта зума
      moveVector.current.setFromMatrixColumn(camera.matrix, 2)
      moveVector.current.multiplyScalar(direction * zoomSpeed * 0.1)
      camera.position.add(moveVector.current)
      
      // Ограничиваем позицию камеры границами помещения
      camera.position.x = Math.max(
        bounds.minX + 1,
        Math.min(bounds.maxX - 1, camera.position.x)
      )
      camera.position.z = Math.max(
        bounds.minZ + 1,
        Math.min(bounds.maxZ - 1, camera.position.z)
      )
      camera.position.y = Math.max(
        bounds.minY,
        Math.min(bounds.maxY, camera.position.y)
      )
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    gl.domElement.addEventListener('mousedown', handleMouseDown)
    gl.domElement.addEventListener('mouseup', handleMouseUp)
    gl.domElement.addEventListener('mousemove', handleMouseMove)
    gl.domElement.addEventListener('wheel', handleWheel, { passive: false })
    gl.domElement.addEventListener('contextmenu', handleContextMenu)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      gl.domElement.removeEventListener('mousedown', handleMouseDown)
      gl.domElement.removeEventListener('mouseup', handleMouseUp)
      gl.domElement.removeEventListener('mousemove', handleMouseMove)
      gl.domElement.removeEventListener('wheel', handleWheel)
      gl.domElement.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [camera, gl, bounds, isDragging])

  useFrame((state, delta) => {
    // Кинематографичный фокус: плавное сближение камеры за ~0.5–0.8 с (exponential damping)
    if (focusTarget && setFocusTarget) {
      const targetVec = new THREE.Vector3(focusTarget[0], focusTarget[1], focusTarget[2])
      const desiredOffset = new THREE.Vector3(0, 2.5, 10)
      const desiredPosition = targetVec.clone().add(desiredOffset)
      const DAMP_SPEED = 6
      const smoothFactor = 1 - Math.exp(-DAMP_SPEED * delta)
      camera.position.lerp(desiredPosition, smoothFactor)
      camera.lookAt(targetVec)
      if (camera.position.distanceTo(desiredPosition) < 0.02) {
        camera.position.copy(desiredPosition)
        setFocusTarget(null)
      }
      return
    }

    const forward = Number(moveForward.current) - Number(moveBackward.current)
    const right = Number(moveRight.current) - Number(moveLeft.current)
    const up = Number(moveUp.current) - Number(moveDown.current)

    if (forward === 0 && right === 0 && up === 0) {
      return
    }

    const moveSpeed = 10.0
    const speed = moveSpeed * delta

    // Движение вперед/назад (по направлению камеры)
    if (forward !== 0) {
      moveVector.current.setFromMatrixColumn(camera.matrix, 2)
      moveVector.current.multiplyScalar(-forward * speed)
      camera.position.add(moveVector.current)
    }

    // Движение влево/вправо
    if (right !== 0) {
      moveVector.current.setFromMatrixColumn(camera.matrix, 0)
      moveVector.current.multiplyScalar(right * speed)
      camera.position.add(moveVector.current)
    }

    // Движение вверх/вниз
    if (up !== 0) {
      moveVector.current.set(0, up * speed, 0)
      camera.position.add(moveVector.current)
    }

    // Ограничиваем позицию камеры границами помещения
    camera.position.x = Math.max(
      bounds.minX + 1,
      Math.min(bounds.maxX - 1, camera.position.x)
    )
    camera.position.z = Math.max(
      bounds.minZ + 1,
      Math.min(bounds.maxZ - 1, camera.position.z)
    )
    camera.position.y = Math.max(
      bounds.minY,
      Math.min(bounds.maxY, camera.position.y)
    )
  })

  return null
}

// Визуальная сетка на полу (Y=0), плавное появление при включённой привязке к сетке
function EditorGridHelper() {
  const ctx = useEditorGallery()
  const gridSnap = ctx?.gridSnap ?? false
  const gridRef = useRef<THREE.Mesh>(null)
  const opacityRef = useRef(0)

  useFrame((_, delta) => {
    if (!gridRef.current) return
    const target = gridSnap ? 1 : 0
    opacityRef.current += (target - opacityRef.current) * Math.min(1, delta * 4)
    const mat = gridRef.current.material as THREE.Material & { opacity?: number }
    if (mat && 'opacity' in mat) mat.opacity = opacityRef.current
    gridRef.current.visible = opacityRef.current > 0.01
  })

  return (
    <Grid
      ref={gridRef}
      position={[0, 0, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      args={[100, 100]}
      sectionSize={1}
      sectionColor="#3b82f6"
      cellColor="#3b82f6"
      cellThickness={0.5}
      sectionThickness={0.8}
      fadeDistance={30}
      fadeStrength={1}
      infiniteGrid={false}
    />
  )
}
class ModelErrorBoundary extends React.Component<
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

interface GalleryEditorProps {
  exhibit: Exhibit
  position: [number, number, number]
  scale: number
  rotationY: number
  isSelected: boolean
  hasSelection: boolean
  transformMode: 'translate' | 'rotate' | 'scale'
  lockHeight: boolean
  gridSnap: boolean
  onPositionChange: (position: [number, number, number]) => void
  onScaleChange: (scale: number) => void
  onRotationChange: (rotation: number) => void
  onSelect: () => void
  onControlsDragStart: () => void
  onControlsDragEnd: () => void
  visible?: boolean
  locked?: boolean
}

// Компонент экспоната в редакторе с TransformControls (ref-based обновления, setState только на mouseUp)
function EditableExhibit({
  exhibit,
  position,
  scale,
  rotationY,
  isSelected,
  hasSelection,
  transformMode,
  lockHeight,
  gridSnap,
  onPositionChange,
  onScaleChange,
  onRotationChange,
  onSelect,
  onControlsDragStart,
  onControlsDragEnd,
  visible = true,
  locked = false,
}: GalleryEditorProps) {
  const groupRef = useRef<THREE.Group>(null)
  // Используем свой тип вместо THREE.TransformControls, которого нет в d.ts
  type TransformControlsLike = THREE.Object3D & { gizmo?: THREE.Object3D; plane?: THREE.Object3D }
  const controlsRef = useRef<TransformControlsLike | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [lockFlash, setLockFlash] = useState(false)

  const handleClickSelect = useCallback(
    (e: any) => {
      e.stopPropagation()
      if (locked) {
        setLockFlash(true)
        setTimeout(() => setLockFlash(false), 450)
        return
      }
      onSelect()
    },
    [onSelect, locked]
  )

  // При выборе экспоната синхронизируем ref с текущими props (чтобы TransformControls начал с правильной позиции)
  useEffect(() => {
    if (groupRef.current && isSelected) {
      groupRef.current.position.set(position[0], position[1], position[2])
      groupRef.current.rotation.set(0, rotationY, 0)
      groupRef.current.scale.setScalar(scale)
    }
  }, [isSelected, position[0], position[1], position[2], rotationY, scale])

  // Гизмо поверх геометрии: depthTest: false для приоритета отрисовки стрелок над моделями.
  // При внедрении режима «от первого лица» рассмотреть отдельный слой рендеринга для гизмо,
  // чтобы стрелки не рисовались сквозь руки/тело камеры (например, слой 1 для гизмо и отсечение по слою).
  useEffect(() => {
    const ctrl = controlsRef.current
    if (!ctrl || !isSelected || locked) return
    const setDepthTest = (obj: THREE.Object3D) => {
      obj.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (mesh.material) {
          const arr = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          arr.forEach((m) => {
            if (m && 'depthTest' in m) (m as THREE.Material).depthTest = false
          })
        }
      })
    }
    setDepthTest(ctrl)
  }, [isSelected, locked])

  const flushTransformToState = useCallback(() => {
    if (!groupRef.current) return
    const obj = groupRef.current
    let y = obj.position.y
    if (lockHeight) y = GALLERY_BOUNDS.minY
    const clamped: [number, number, number] = [
      Math.max(GALLERY_BOUNDS.minX, Math.min(GALLERY_BOUNDS.maxX, obj.position.x)),
      Math.max(GALLERY_BOUNDS.minY, Math.min(GALLERY_BOUNDS.maxY, y)),
      Math.max(GALLERY_BOUNDS.minZ, Math.min(GALLERY_BOUNDS.maxZ, obj.position.z)),
    ]
    onPositionChange(clamped)
    onRotationChange(obj.rotation.y)
    const s = Math.max(0.1, Math.min(3, obj.scale.x))
    onScaleChange(s)
  }, [lockHeight, onPositionChange, onRotationChange, onScaleChange])

  const handleControlsChange = useCallback(() => {
    if (!groupRef.current || !controlsRef.current) return
    if (lockHeight && transformMode === 'translate') {
      groupRef.current.position.y = GALLERY_BOUNDS.minY
    }
  }, [lockHeight, transformMode])

  const handleControlsMouseDown = useCallback(() => {
    onControlsDragStart()
  }, [onControlsDragStart])

  const handleControlsMouseUp = useCallback(() => {
    flushTransformToState()
    onControlsDragEnd()
  }, [flushTransformToState, onControlsDragEnd])

  return (
    <>
      {isSelected && !locked ? (
        <TransformControls
          ref={controlsRef}
          object={groupRef as React.RefObject<THREE.Group>}
          mode={transformMode}
          showX={true}
          showY={!lockHeight}
          showZ={true}
          size={0.75}
          translationSnap={gridSnap ? 0.5 : undefined}
          rotationSnap={gridSnap ? Math.PI / 12 : undefined}
          onMouseDown={() => {
            handleControlsMouseDown()
          }}
          onChange={handleControlsChange}
          onMouseUp={() => {
            handleControlsMouseUp()
          }}
        >
          <Select enabled>
            <group
              ref={groupRef}
              position={[position[0], position[1], position[2]]}
              rotation={[0, rotationY, 0]}
              scale={[scale, scale, scale]}
              visible={visible}
            >
              <ExhibitContent exhibit={exhibit} scale={scale} isHovered={isHovered} onSelect={handleClickSelect} isSelected={isSelected} hasSelection={hasSelection} lockFlash={lockFlash} />
              <SelectedIndicator scale={scale} />
            </group>
          </Select>
        </TransformControls>
      ) : (
        <group
          ref={groupRef}
          position={position}
          rotation={[0, rotationY, 0]}
          scale={scale}
          visible={visible}
          onClick={handleClickSelect}
          onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true) }}
          onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false) }}
        >
          <ExhibitContent exhibit={exhibit} scale={scale} isHovered={isHovered} onSelect={handleClickSelect} isSelected={isSelected} hasSelection={hasSelection} lockFlash={lockFlash} />
          {isSelected && <SelectedIndicator scale={scale} />}
        </group>
      )}
    </>
  )
}

// Модель и хитбокс экспоната (opacity для эффекта фокуса, emissive для контура выбранного, lockFlash — красная вспышка при клике на заблокированный)
function ExhibitContent({
  exhibit,
  scale,
  isHovered,
  onSelect,
  isSelected,
  hasSelection,
  lockFlash = false,
}: {
  exhibit: Exhibit
  scale: number
  isHovered: boolean
  onSelect: () => void
  isSelected: boolean
  hasSelection: boolean
  lockFlash?: boolean
}) {
  const opacity = hasSelection && !isSelected ? 0.35 : 1
  const emissiveIntensity = lockFlash ? 0.95 : (isSelected ? 0.45 : 0)
  const emissiveColor = lockFlash ? '#ef4444' : '#3b82f6'
  return (
    <>
      <mesh
        position={[0, 1 * scale, 0]}
        scale={scale}
        onPointerDown={(e) => e.stopPropagation()}
        visible={false}
      >
        <boxGeometry args={[4, 4, 4]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <group scale={scale} position={[0, 0, 0]}>
        <Suspense
          fallback={
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#9ca3af" />
            </mesh>
          }
        >
          {exhibit.has3DModel && exhibit.modelPath ? (
            <ModelErrorBoundary
              key={`${exhibit.id}-${exhibit.modelPath}`}
              fallback={
                <mesh>
                  <boxGeometry args={[1, 1, 1]} />
                  <meshStandardMaterial color="#9ca3af" />
                </mesh>
              }
            >
              <SafeModelWrapper
                modelPath={exhibit.modelPath}
                opacity={opacity}
                emissiveIntensity={emissiveIntensity}
                emissiveColor={emissiveColor}
              />
            </ModelErrorBoundary>
          ) : (
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#9ca3af" />
            </mesh>
          )}
        </Suspense>
      </group>
    </>
  )
}

function SelectedIndicator({ scale }: { scale: number }) {
  return (
    <>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={scale}>
        <ringGeometry args={[0.9, 1.1, 32]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2 * scale, 0]} scale={scale}>
        <coneGeometry args={[0.2, 0.5, 8]} />
        <meshStandardMaterial color="#3b82f6" emissive="#2563eb" emissiveIntensity={0.3} />
      </mesh>
    </>
  )
}

export default function GalleryEditorPage() {
  const [exhibits, setExhibits] = useState<Exhibit[]>([])
  const [selectedExhibitId, setSelectedExhibitId] = useState<string | null>(null)
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [lockHeight, setLockHeight] = useState(false)
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate')
  const [hasAccess, setHasAccess] = useState(false)
  const [gridSnap, setGridSnap] = useState(false)
  const [exhibitVisibility, setExhibitVisibility] = useState<Record<string, boolean>>({})
  const [exhibitLocked, setExhibitLocked] = useState<Record<string, boolean>>({})

  const selectExhibitAndFocus = useCallback((exhibit: Exhibit) => {
    setSelectedExhibitId(exhibit.id)
    setFocusTarget([
      exhibit.galleryPositionX ?? 0,
      exhibit.galleryPositionY ?? 0,
      exhibit.galleryPositionZ ?? 0,
    ])
  }, [])

  // Горячие клавиши W / E / R для смены режима трансформации
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) return
      switch (event.code) {
        case 'KeyW':
          event.preventDefault()
          setTransformMode('translate')
          break
        case 'KeyE':
          event.preventDefault()
          setTransformMode('rotate')
          break
        case 'KeyR':
          event.preventDefault()
          setTransformMode('scale')
          break
        case 'KeyF':
          event.preventDefault()
          if (selectedExhibitId) {
            const ex = exhibits.find((e) => e.id === selectedExhibitId)
            if (ex) setFocusTarget([ex.galleryPositionX ?? 0, ex.galleryPositionY ?? 0, ex.galleryPositionZ ?? 0])
          }
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [exhibits, selectedExhibitId, setFocusTarget])

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.role === 'super') {
          setHasAccess(true)
          loadExhibits()
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const loadExhibits = async () => {
    try {
      const response = await fetch('/api/exhibits')
      if (response.ok) {
        const data: Exhibit[] = await response.json()
        const withModels = data.filter((ex) => ex.has3DModel && ex.modelPath)
        setExhibits(withModels)
        if (withModels.length > 0 && !selectedExhibitId) {
          setSelectedExhibitId(withModels[0].id)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки экспонатов:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePositionChange = useCallback(
    (exhibitId: string, position: [number, number, number]) => {
      // Ограничиваем позицию границами помещения
      const clampedPosition: [number, number, number] = [
        Math.max(GALLERY_BOUNDS.minX, Math.min(GALLERY_BOUNDS.maxX, position[0])),
        Math.max(GALLERY_BOUNDS.minY, Math.min(GALLERY_BOUNDS.maxY, position[1])),
        Math.max(GALLERY_BOUNDS.minZ, Math.min(GALLERY_BOUNDS.maxZ, position[2])),
      ]
      
      setExhibits((prev) =>
        prev.map((ex) =>
          ex.id === exhibitId
            ? {
                ...ex,
                galleryPositionX: clampedPosition[0],
                galleryPositionY: clampedPosition[1],
                galleryPositionZ: clampedPosition[2],
              }
            : ex
        )
      )
    },
    []
  )

  const handleScaleChange = useCallback((exhibitId: string, scale: number) => {
    setExhibits((prev) =>
      prev.map((ex) => (ex.id === exhibitId ? { ...ex, galleryScale: scale } : ex))
    )
  }, [])

  const handleRotationChange = useCallback(
    (exhibitId: string, rotation: number) => {
      setExhibits((prev) =>
        prev.map((ex) =>
          ex.id === exhibitId ? { ...ex, galleryRotationY: rotation } : ex
        )
      )
    },
    []
  )

  const handleSave = async () => {
    if (!selectedExhibitId) {
      alert('Выберите экспонат для сохранения')
      return
    }

    const exhibit = exhibits.find((ex) => ex.id === selectedExhibitId)
    if (!exhibit) {
      alert('Экспонат не найден')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/exhibits/${exhibit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...exhibit,
          galleryPositionX: exhibit.galleryPositionX ?? 0,
          galleryPositionY: exhibit.galleryPositionY ?? 0,
          galleryPositionZ: exhibit.galleryPositionZ ?? 0,
          galleryScale: exhibit.galleryScale ?? 1.0,
          galleryRotationY: exhibit.galleryRotationY ?? 0,
        }),
      })

      if (response.ok) {
        alert('Позиция экспоната сохранена!')
        await loadExhibits()
      } else {
        alert('Ошибка сохранения')
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      alert('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const promises = exhibits.map((exhibit) =>
        fetch(`/api/exhibits/${exhibit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...exhibit,
            galleryPositionX: exhibit.galleryPositionX ?? 0,
            galleryPositionY: exhibit.galleryPositionY ?? 0,
            galleryPositionZ: exhibit.galleryPositionZ ?? 0,
            galleryScale: exhibit.galleryScale ?? 1.0,
            galleryRotationY: exhibit.galleryRotationY ?? 0,
          }),
        })
      )

      await Promise.all(promises)
      alert('Все изменения сохранены!')
      await loadExhibits()
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      alert('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Доступ запрещен</h1>
          <p className="text-gray-600 mb-6">
            У вас нет прав для доступа к редактору галереи. Эта функция доступна только супер-администратору.
          </p>
          <a
            href="/admin"
            className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Вернуться в админ-панель
          </a>
        </div>
      </div>
    )
  }

  if (exhibits.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Нет экспонатов с 3D моделями</p>
          <a href="/admin" className="text-primary-600 hover:underline">
            Вернуться в админ-панель
          </a>
        </div>
      </div>
    )
  }

  const selectedExhibit = selectedExhibitId 
    ? exhibits.find((ex) => ex.id === selectedExhibitId) 
    : null
  const position: [number, number, number] = selectedExhibit
    ? [
        selectedExhibit.galleryPositionX ?? 0,
        selectedExhibit.galleryPositionY ?? 0,
        selectedExhibit.galleryPositionZ ?? 0,
      ]
    : [0, 0, 0]
  const scale = selectedExhibit?.galleryScale ?? 1.0
  const rotationY = selectedExhibit?.galleryRotationY ?? 0

  return (
    <EditorGalleryContext.Provider value={{ focusTarget, setFocusTarget, gridSnap }}>
    <div className="flex h-screen">
      {/* Боковая панель управления */}
      <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Редактор галереи</h1>

        {/* Список экспонатов: выбор по клику + Следующий / Предыдущий + Дерево сцены (глаз/замок) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Выберите экспонат (клик — фокус камеры)
          </label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => {
                const idx = exhibits.findIndex((e) => e.id === selectedExhibitId)
                const prevIdx = idx <= 0 ? exhibits.length - 1 : idx - 1
                selectExhibitAndFocus(exhibits[prevIdx])
              }}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              title="Предыдущий"
            >
              ← Пред.
            </button>
            <button
              type="button"
              onClick={() => {
                const idx = exhibits.findIndex((e) => e.id === selectedExhibitId)
                const nextIdx = idx < 0 ? 0 : (idx + 1) % exhibits.length
                selectExhibitAndFocus(exhibits[nextIdx])
              }}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              title="Следующий"
            >
              След. →
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedExhibitId) {
                  const ex = exhibits.find((e) => e.id === selectedExhibitId)
                  if (ex) setFocusTarget([ex.galleryPositionX ?? 0, ex.galleryPositionY ?? 0, ex.galleryPositionZ ?? 0])
                }
              }}
              disabled={!selectedExhibitId}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-primary-100 text-primary-800 hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Фокус камеры на выбранный объект (F)"
            >
              Фокус (F)
            </button>
          </div>
          <div className="border border-gray-300 rounded-lg max-h-52 overflow-y-auto">
            {exhibits.map((ex) => {
              const visible = exhibitVisibility[ex.id] !== false
              const locked = exhibitLocked[ex.id] === true
              return (
                <div
                  key={ex.id}
                  className={`flex items-center gap-1 w-full text-left border-b border-gray-100 last:border-b-0 ${
                    selectedExhibitId === ex.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectExhibitAndFocus(ex)}
                    className="flex-1 min-w-0 px-2 py-1.5 text-sm hover:bg-gray-50 text-left truncate"
                    title={ex.title}
                  >
                    {ex.title}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setExhibitVisibility((v) => ({ ...v, [ex.id]: !visible })) }}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                    title={visible ? 'Скрыть' : 'Показать'}
                  >
                    {visible ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    ) : (
                      <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setExhibitLocked((l) => ({ ...l, [ex.id]: !locked })) }}
                    className={`p-1.5 rounded hover:bg-gray-200 ${locked ? 'text-amber-600' : 'text-gray-500'}`}
                    title={locked ? 'Разблокировать трансформацию' : 'Заблокировать трансформацию'}
                  >
                    {locked ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Режим трансформации (W / E / R) */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">Режим (W / E / R)</h3>
          <p className="text-xs text-gray-500 mb-2">Выбранный объект отмечен синим кольцом и стрелкой; гизмо — только у выбранного.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTransformMode('translate')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                transformMode === 'translate' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Перемещение (W)"
            >
              W Перемещение
            </button>
            <button
              type="button"
              onClick={() => setTransformMode('rotate')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                transformMode === 'rotate' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Вращение (E)"
            >
              E Вращение
            </button>
            <button
              type="button"
              onClick={() => setTransformMode('scale')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                transformMode === 'scale' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Масштаб (R)"
            >
              R Масштаб
            </button>
          </div>
        </div>

        {/* Фиксация высоты (только для режима «Перемещение») */}
        <div className="mb-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={lockHeight}
              onChange={(e) => setLockHeight(e.target.checked)}
              disabled={transformMode !== 'translate'}
              className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 disabled:opacity-50"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              Фиксировать высоту (Y = 0)
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-7">
            {transformMode !== 'translate'
              ? 'Доступно только в режиме «Перемещение»'
              : lockHeight
                ? 'Ось Y скрыта на гизмо, объект не проваливается под пол'
                : 'Снять галочку, чтобы двигать объект по высоте'}
          </p>
        </div>

        <div className="mb-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={gridSnap}
              onChange={(e) => setGridSnap(e.target.checked)}
              className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              Привязка к сетке
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-7">
            Перемещение шаг 0.5, поворот шаг 15°
          </p>
        </div>

        {/* Позиция */}
        <div className="mb-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Позиция</h3>
          {selectedExhibit ? (
            <div className="space-y-2">
              <div>
                <label className="block text-sm text-gray-600 mb-1">X (Влево/Вправо)</label>
                <input
                  type="number"
                  step="0.1"
                  value={position[0].toFixed(2)}
                  onChange={(e) => {
                    const newPos: [number, number, number] = [
                      parseFloat(e.target.value) || 0,
                      position[1],
                      position[2],
                    ]
                    handlePositionChange(selectedExhibit.id, newPos)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Y (Высота) - только вручную</label>
                <input
                  type="number"
                  step="0.1"
                  value={position[1].toFixed(2)}
                  onChange={(e) => {
                    const newPos: [number, number, number] = [
                      position[0],
                      parseFloat(e.target.value) || 0,
                      position[2],
                    ]
                    handlePositionChange(selectedExhibit.id, newPos)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  title="Высота изменяется только вручную через это поле"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Z (Вперед/Назад)</label>
                <input
                  type="number"
                  step="0.1"
                  value={position[2].toFixed(2)}
                  onChange={(e) => {
                    const newPos: [number, number, number] = [
                      position[0],
                      position[1],
                      parseFloat(e.target.value) || 0,
                    ]
                    handlePositionChange(selectedExhibit.id, newPos)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              Выберите экспонат для редактирования
            </p>
          )}
        </div>

        {/* Масштаб */}
        {selectedExhibit && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Масштаб: {scale.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={scale}
              onChange={(e) =>
                handleScaleChange(selectedExhibit.id, parseFloat(e.target.value))
              }
              className="w-full"
            />
          </div>
        )}

        {/* Поворот */}
        {selectedExhibit && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Поворот: {(rotationY * (180 / Math.PI)).toFixed(1)}°
            </label>
            <input
              type="range"
              min="0"
              max={Math.PI * 2}
              step="0.1"
              value={rotationY}
              onChange={(e) =>
                handleRotationChange(selectedExhibit.id, parseFloat(e.target.value))
              }
              className="w-full"
            />
          </div>
        )}

        {/* Кнопки сохранения */}
        <div className="space-y-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Сохранение...' : 'Сохранить выбранный'}
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Сохранение...' : 'Сохранить все'}
          </button>
        </div>

      </div>

      {/* 3D редактор */}
      <div className="flex-1 relative bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
        <Canvas
          camera={{ position: [0, 3, 10], fov: 75 }}
          style={{ width: '100%', height: '100%' }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          shadows={true}
        >
          <Selection>
            {selectedExhibitId !== null && (
              <EffectComposer>
                <Outline edgeStrength={3} visibleEdgeColor={0x3b82f6} blur xRay />
              </EffectComposer>
            )}
          {/* Улучшенное освещение */}
          <ambientLight intensity={0.4} color="#ffffff" />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <directionalLight position={[-10, 8, -5]} intensity={0.6} color="#fff8e1" />
          <pointLight position={[0, 7.5, 0]} intensity={1.5} distance={40} decay={2} color="#fff8e1" />
          <pointLight position={[-15, 7, -15]} intensity={0.8} distance={30} decay={2} color="#e0e7ff" />
          <pointLight position={[15, 7, -15]} intensity={0.8} distance={30} decay={2} color="#e0e7ff" />
          <Environment preset="sunset" />

          {/* Пол - улучшенный дизайн */}
          <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, 0, 0]} 
            receiveShadow
            onPointerDown={(e) => {
              // Клик на пол - сбрасываем выделение
              if (e.button === 0) { // Только левая кнопка мыши
                e.stopPropagation()
                setSelectedExhibitId(null)
              }
            }}
          >
            <planeGeometry args={[100, 100, 50, 50]} />
            <meshStandardMaterial
              color="#f5f3f0"
              roughness={0.2}
              metalness={0.1}
              envMapIntensity={1}
            />
          </mesh>

          {/* Визуальная сетка при включённой привязке к сетке (Y=0) */}
          <EditorGridHelper />
          
          {/* Декоративные линии на полу - убраны для чистоты дизайна */}

          {/* Границы помещения - визуальные маркеры */}
          <group>
            {/* Углы помещения */}
            {[
              [-24, 0, -24],
              [24, 0, -24],
              [24, 0, 24],
              [-24, 0, 24],
            ].map((pos, i) => (
              <mesh key={i} position={[pos[0], 0.1, pos[2]]}>
                <cylinderGeometry args={[0.2, 0.2, 0.2, 16]} />
                <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
              </mesh>
            ))}
            
            {/* Линии границ */}
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(48, 0.1, 48)]} />
              <lineBasicMaterial color="#3b82f6" opacity={0.3} transparent />
            </lineSegments>
          </group>

          {/* Все экспонаты */}
          <Suspense fallback={null}>
            {exhibits.map((exhibit) => {
              const exhibitPosition: [number, number, number] = [
                exhibit.galleryPositionX ?? 0,
                exhibit.galleryPositionY ?? 0,
                exhibit.galleryPositionZ ?? 0,
              ]
              const exhibitScale = exhibit.galleryScale ?? 1.0
              const exhibitRotation = exhibit.galleryRotationY ?? 0

              return (
                <EditableExhibit
                  key={exhibit.id}
                  exhibit={exhibit}
                  position={exhibitPosition}
                  scale={exhibitScale}
                  rotationY={exhibitRotation}
                  isSelected={selectedExhibitId === exhibit.id}
                  hasSelection={!!selectedExhibitId}
                  transformMode={transformMode}
                  lockHeight={lockHeight}
                  gridSnap={gridSnap}
                  onPositionChange={(pos) => handlePositionChange(exhibit.id, pos)}
                  onScaleChange={(s) => handleScaleChange(exhibit.id, s)}
                  onRotationChange={(r) => handleRotationChange(exhibit.id, r)}
                  onSelect={() => setSelectedExhibitId(exhibit.id)}
                  onControlsDragStart={() => setIsDragging(true)}
                  onControlsDragEnd={() => setIsDragging(false)}
                  visible={exhibitVisibility[exhibit.id] !== false}
                  locked={exhibitLocked[exhibit.id] === true}
                />
              )
            })}
          </Suspense>

          {/* Управление камерой через WASD и мышью */}
          <EditorCameraControls bounds={GALLERY_BOUNDS} isDragging={isDragging} />
          </Selection>
        </Canvas>
      </div>
    </div>
    </EditorGalleryContext.Provider>
  )
}

