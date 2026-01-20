'use client'

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { Exhibit } from '@/types/exhibit'
import SafeModelWrapper from '@/components/SafeModel'

// Константы границ галереи
const GALLERY_BOUNDS = {
  minX: -24,
  maxX: 24,
  minZ: -24,
  maxZ: 24,
  minY: 0.5,
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
  const moveForward = useRef(false)
  const moveBackward = useRef(false)
  const moveLeft = useRef(false)
  const moveRight = useRef(false)
  const moveUp = useRef(false)
  const moveDown = useRef(false)
  const moveVector = useRef(new THREE.Vector3())
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const isRightMouseDown = useRef(false) // Правая кнопка мыши для вращения
  const isMiddleMouseDown = useRef(false) // Средняя кнопка для панорамирования
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

// ErrorBoundary для обработки ошибок загрузки моделей
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
  onPositionChange: (position: [number, number, number]) => void
  onScaleChange: (scale: number) => void
  onRotationChange: (rotation: number) => void
  onSelect: () => void
  onDragStart: () => void
  onDragEnd: () => void
  lockHeight: boolean
  isRotating: boolean
}

// Компонент экспоната в редакторе - идентичен виртуальной галерее
function EditableExhibit({
  exhibit,
  position,
  scale,
  rotationY,
  isSelected,
  onPositionChange,
  onScaleChange,
  onRotationChange,
  onSelect,
  onDragStart,
  onDragEnd,
  lockHeight,
  isRotating,
}: GalleryEditorProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const dragStartRef = useRef<{
    mouse: THREE.Vector2
    position: [number, number, number]
    rotation: number
    plane: THREE.Plane
  } | null>(null)
  const { raycaster, camera, gl } = useThree()
  
  // Помечаем объекты экспоната для идентификации
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.traverse((child) => {
        child.userData.isExhibit = true
      })
    }
  }, [])

  // Обработка перетаскивания
  const handlePointerDown = useCallback(
    (e: any) => {
      e.stopPropagation()
      setIsDragging(true)
      setIsHovered(true)
      onSelect()
      onDragStart() // Уведомляем родителя о начале перетаскивания
      
      // Получаем координаты мыши в нормализованных координатах (-1 до 1)
      const mouse = new THREE.Vector2()
      const rect = gl.domElement.getBoundingClientRect()
      const clientX = e.nativeEvent?.clientX ?? e.clientX ?? 0
      const clientY = e.nativeEvent?.clientY ?? e.clientY ?? 0
      mouse.x = (clientX - rect.left) / rect.width * 2 - 1
      mouse.y = -(clientY - rect.top) / rect.height * 2 + 1
      
      // Создаем плоскость для перемещения на уровне экспоната
      const planeNormal = new THREE.Vector3(0, 1, 0) // Горизонтальная плоскость
      const planePoint = new THREE.Vector3(position[0], position[1], position[2])
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint)
      
      dragStartRef.current = {
        mouse: mouse.clone(),
        position: [...position] as [number, number, number],
        rotation: rotationY,
        plane,
      }
      // Безопасный вызов setPointerCapture с обработкой ошибок
      try {
        const target = e.target as HTMLElement
        if (target && target.setPointerCapture && e.pointerId !== undefined) {
          target.setPointerCapture(e.pointerId)
        }
      } catch (error) {
        // Игнорируем ошибку, если setPointerCapture не поддерживается или недоступен
        console.debug('setPointerCapture не доступен:', error)
      }
    },
    [position, rotationY, onSelect, onDragStart, gl]
  )

  const handlePointerMove = useCallback(
    (e: any) => {
      // Продолжаем перетаскивание даже если пользователь нажимает другие кнопки мыши
      if (isDragging && dragStartRef.current && groupRef.current) {
        // Проверяем, зажат ли Shift для режима вращения
        const shiftPressed = e.shiftKey || (e.nativeEvent?.shiftKey ?? false)
        const shouldRotate = isRotating || shiftPressed
        
        // Получаем текущие координаты мыши
        const rect = gl.domElement.getBoundingClientRect()
        const currentMouse = new THREE.Vector2()
        const clientX = e.nativeEvent?.clientX ?? e.clientX ?? 0
        const clientY = e.nativeEvent?.clientY ?? e.clientY ?? 0
        currentMouse.x = (clientX - rect.left) / rect.width * 2 - 1
        currentMouse.y = -(clientY - rect.top) / rect.height * 2 + 1
        
        if (shouldRotate) {
          // Режим вращения: вычисляем угол поворота на основе движения мыши
          const mouseDelta = new THREE.Vector2().subVectors(
            currentMouse,
            dragStartRef.current.mouse
          )
          
          // Вычисляем угол поворота на основе горизонтального движения мыши
          const rotationDelta = mouseDelta.x * Math.PI * 2 // Полный оборот при движении мыши по всей ширине
          const newRotation = dragStartRef.current.rotation + rotationDelta
          
          // Нормализуем угол в диапазон [0, 2π]
          const normalizedRotation = ((newRotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2)
          onRotationChange(normalizedRotation)
        } else {
          // Режим перемещения
          let newPos: [number, number, number]
          
          if (lockHeight) {
            // Режим изменения высоты: вертикальное движение мыши = изменение Y
            const mouseDelta = new THREE.Vector2().subVectors(
              currentMouse,
              dragStartRef.current.mouse
            )
            
            const moveX = mouseDelta.x * 5 // Масштабируем для плавности
            const moveY = mouseDelta.y * 5
            
            newPos = [
              dragStartRef.current.position[0] + moveX, // Горизонтальное движение = X
              dragStartRef.current.position[1] + moveY, // Вертикальное движение = Y (высота)
              dragStartRef.current.position[2], // Z фиксирован
            ]
          } else {
            // Обычный режим: используем raycasting на плоскости для точного перемещения
            raycaster.setFromCamera(currentMouse, camera)
            
            const intersection = new THREE.Vector3()
            if (raycaster.ray.intersectPlane(dragStartRef.current.plane, intersection)) {
              // Получаем начальную точку пересечения
              raycaster.setFromCamera(dragStartRef.current.mouse, camera)
              const startIntersection = new THREE.Vector3()
              if (raycaster.ray.intersectPlane(dragStartRef.current.plane, startIntersection)) {
                const delta = new THREE.Vector3().subVectors(intersection, startIntersection)
                
                newPos = [
                  dragStartRef.current.position[0] + delta.x, // Горизонтальное движение = X
                  dragStartRef.current.position[1], // Высота фиксирована
                  dragStartRef.current.position[2] + delta.z, // Вертикальное движение мыши = Z (вперед/назад)
                ]
              } else {
                // Fallback: используем простой расчет через дельту мыши
                const mouseDelta = new THREE.Vector2().subVectors(
                  currentMouse,
                  dragStartRef.current.mouse
                )
                const moveX = mouseDelta.x * 5
                const moveZ = -mouseDelta.y * 5
                
                newPos = [
                  dragStartRef.current.position[0] + moveX,
                  dragStartRef.current.position[1],
                  dragStartRef.current.position[2] + moveZ,
                ]
              }
            } else {
              // Fallback: используем простой расчет через дельту мыши
              const mouseDelta = new THREE.Vector2().subVectors(
                currentMouse,
                dragStartRef.current.mouse
              )
              const moveX = mouseDelta.x * 5
              const moveZ = -mouseDelta.y * 5
              
              newPos = [
                dragStartRef.current.position[0] + moveX,
                dragStartRef.current.position[1],
                dragStartRef.current.position[2] + moveZ,
              ]
            }
          }
          
          onPositionChange(newPos)
        }
      }
    },
    [isDragging, onPositionChange, onRotationChange, lockHeight, isRotating, camera, raycaster, gl]
  )

  const handlePointerUp = useCallback(
    (e: any) => {
      // Останавливаем перетаскивание только если отпущена левая кнопка мыши
      // Проверяем button или используем pointerId для определения кнопки
      const button = e.button
      const pointerId = e.pointerId
      const isLeftButton = button === undefined || button === 0
      
      if (isLeftButton) {
        setIsDragging(false)
        dragStartRef.current = null
        onDragEnd() // Уведомляем родителя об окончании перетаскивания
        // Безопасный вызов releasePointerCapture с обработкой ошибок
        try {
          const target = e.target as HTMLElement
          if (target && target.releasePointerCapture && pointerId !== undefined) {
            target.releasePointerCapture(pointerId)
          }
        } catch (error) {
          // Игнорируем ошибку, если releasePointerCapture не поддерживается
          console.debug('releasePointerCapture не доступен:', error)
        }
      }
    },
    [onDragEnd]
  )


  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotationY, 0]}
    >
      {/* Невидимая область для взаимодействия - можно кликать на весь экспонат */}
      {/* Масштабируем область взаимодействия вместе с моделью */}
      <mesh
        position={[0, 1 * scale, 0]}
        scale={scale}
        onPointerOver={(e) => {
          e.stopPropagation()
          setIsHovered(true)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setIsHovered(false)
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={(e) => {
          // Обрабатываем отмену pointer events (например, при нажатии других кнопок)
          // Не останавливаем перетаскивание, если это не левая кнопка
          const button = (e as any).button
          if (button === 0 || button === undefined) {
            setIsDragging(false)
            dragStartRef.current = null
            onDragEnd()
          }
        }}
      >
        <boxGeometry args={[4, 4, 4]} />
        <meshStandardMaterial visible={false} transparent opacity={0} />
      </mesh>

      {/* 3D модель экспоната - масштабируется отдельно */}
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
              <SafeModelWrapper modelPath={exhibit.modelPath} />
            </ModelErrorBoundary>
          ) : (
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#9ca3af" />
            </mesh>
          )}
        </Suspense>
      </group>

      {/* Визуальная индикация выбранного экспоната */}
      {isSelected && (
        <>
          {/* Подсветка основания - на уровне пола, масштабируется вместе с моделью */}
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={scale}>
            <ringGeometry args={[0.9, 1.1, 32]} />
            <meshStandardMaterial
              color="#3b82f6"
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Индикатор направления (простая стрелка) - масштабируется вместе с моделью */}
          <mesh position={[0, 2 * scale, 0]} scale={scale}>
            <coneGeometry args={[0.2, 0.5, 8]} />
            <meshStandardMaterial color="#3b82f6" />
          </mesh>
        </>
      )}

    </group>
  )
}

export default function GalleryEditorPage() {
  const [exhibits, setExhibits] = useState<Exhibit[]>([])
  const [selectedExhibitId, setSelectedExhibitId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [lockHeight, setLockHeight] = useState(false) // false = обычный режим (вертикальное движение = Z), true = режим высоты (вертикальное движение = Y)
  const [isRotating, setIsRotating] = useState(false) // true = режим вращения, false = режим перемещения
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    // Проверяем права доступа - только для супер-админа
    const auth = localStorage.getItem('admin_auth')
    const role = localStorage.getItem('admin_role')
    
    if (auth === 'true' && role === 'super') {
      setHasAccess(true)
      loadExhibits()
    } else {
      setLoading(false)
    }
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
    <div className="flex h-screen">
      {/* Боковая панель управления */}
      <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Редактор галереи</h1>

        {/* Список экспонатов */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Выберите экспонат
          </label>
          <select
            value={selectedExhibitId || ''}
            onChange={(e) => setSelectedExhibitId(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">-- Не выбрано --</option>
            {exhibits.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title}
              </option>
            ))}
          </select>
        </div>

        {/* Позиция */}
        <div className="mb-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Позиция</h3>
          
          {/* Режимы управления */}
          <div className="mb-3 space-y-2">
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRotating}
                  onChange={(e) => setIsRotating(e.target.checked)}
                  className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Режим вращения (зажать Shift)
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-7">
                {isRotating
                  ? 'Горизонтальное движение мыши вращает экспонат'
                  : 'Горизонтальное движение мыши перемещает влево/вправо (X)'}
              </p>
            </div>
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockHeight}
                  onChange={(e) => setLockHeight(e.target.checked)}
                  disabled={isRotating}
                  className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 disabled:opacity-50"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Режим изменения высоты
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-7">
                {lockHeight
                  ? 'Вертикальное движение мыши изменяет высоту (Y)'
                  : 'Вертикальное движение мыши перемещает вперед/назад (Z)'}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <p className="text-xs text-blue-700">
              💡 {lockHeight
                ? 'Вертикальное движение мыши = изменение высоты (Y). Горизонтальное = X.'
                : 'Вертикальное движение мыши = вперед/назад (Z). Горизонтальное = влево/вправо (X).'}
            </p>
          </div>
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
                  onPositionChange={(pos) => handlePositionChange(exhibit.id, pos)}
                  onScaleChange={(s) => handleScaleChange(exhibit.id, s)}
                  onRotationChange={(r) => handleRotationChange(exhibit.id, r)}
                  onSelect={() => setSelectedExhibitId(exhibit.id)}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={() => setIsDragging(false)}
                  lockHeight={lockHeight}
                  isRotating={isRotating}
                />
              )
            })}
          </Suspense>

          {/* Управление камерой через WASD и мышью */}
          <EditorCameraControls bounds={GALLERY_BOUNDS} isDragging={isDragging} />
        </Canvas>
      </div>
    </div>
  )
}
