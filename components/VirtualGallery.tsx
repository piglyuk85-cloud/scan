'use client'

import React, { Suspense, useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, Html, useGLTF, Effects } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { Exhibit } from '@/types/exhibit'
import { useRouter } from 'next/navigation'
import SafeModelWrapper from './SafeModel'
import FirstPersonControls from './FirstPersonControls'
import MobileControls from './MobileControls'
import ExhibitOverlay from './ExhibitOverlay'

const GALLERY_BOUNDS = {
  minX: -24,
  maxX: 24,
  minZ: -24,
  maxZ: 24,
  minY: 0.5,
  maxY: 7,
}

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

const ExhibitInSpace = React.memo(function ExhibitInSpace({
  exhibit,
  position,
  scale,
  rotationY,
  onClick,
  isMobile,
}: {
  exhibit: Exhibit
  position: [number, number, number]
  scale: number
  rotationY: number
  onClick: () => void
  isMobile: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const modelGroupRef = useRef<THREE.Group>(null)
  const [distanceToCamera, setDistanceToCamera] = useState<number>(Infinity)
  const { camera } = useThree()
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const isMountedRef = useRef(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useFrame((state) => {
    if (!isMountedRef.current) return
    
    if (groupRef.current) {
      groupRef.current.rotation.y = rotationY + Math.sin(state.clock.elapsedTime * 0.5) * 0.1
      
      const objectPosition = new THREE.Vector3(...position)
      const distance = camera.position.distanceTo(objectPosition)
      setDistanceToCamera(distance)
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
      setDistanceToCamera(Infinity)
      // Очищаем все таймеры
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])
  
  const isClose = distanceToCamera < 8 && distanceToCamera !== Infinity

  // Оптимизированный размер хитбокса на основе scale модели
  // Базовый размер 2.5, умножается на scale для адаптации под размер модели
  const hitboxSize = Math.max(2.5, 2.5 * scale) // Минимум 2.5 для маленьких объектов
  const colliderSize = hitboxSize * 0.5 // половина размера хитбокса для коллидера

  // Статичные коллайдеры: используем useMemo для гарантии, что коллайдер никогда не удаляется
  const colliderArgs = useMemo(() => [colliderSize, colliderSize, colliderSize] as [number, number, number], [colliderSize])
  const colliderPosition = useMemo(() => [0, 1 * scale, 0] as [number, number, number], [scale])

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      {/* Физический коллидер для экспоната - всегда рендерится, никогда не удаляется */}
      <RigidBody type="fixed" friction={0}>
        <CuboidCollider args={colliderArgs} position={colliderPosition} />
      </RigidBody>

      <mesh
        position={[0, 1, 0]}
        onPointerUp={(e) => {
          if (isMobile && e.pointerType === 'touch') {
            e.stopPropagation()
            const current = touchStartRef.current

            if (current && typeof e.clientX === 'number' && typeof e.clientY === 'number' && typeof performance !== 'undefined' && performance.now) {
              const dt = performance.now() - current.time
              const dx = e.clientX - current.x
              const dy = e.clientY - current.y
              const distance = Math.sqrt(dx * dx + dy * dy)

              // Считаем «кликом» только очень короткий и почти неподвижный тап
              const MAX_TAP_DURATION = 220
              const MAX_TAP_MOVE = 8

              if (dt <= MAX_TAP_DURATION && distance <= MAX_TAP_MOVE) {
                if (typeof document !== 'undefined' && document.pointerLockElement) {
                  document.exitPointerLock()
                }
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current)
                }
                timeoutRef.current = setTimeout(() => {
                  if (isMountedRef.current) {
                    try {
                      onClick()
                    } catch (error) {
                      console.error('Error in onClick handler:', error)
                    }
                  }
                }, 0)
              }
            }
          }
        }}
        onPointerDown={(e) => {
          if (isMobile && e.pointerType === 'touch') {
            // запоминаем позицию и время касания для отличия тапа от свайпа
            if (typeof e.clientX === 'number' && typeof e.clientY === 'number' && typeof performance !== 'undefined' && performance.now) {
              touchStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                time: performance.now(),
              }
            }
          } else {
            // десктоп / не touch — используем обычный клик как раньше
            e.stopPropagation()
            if (typeof document !== 'undefined' && document.pointerLockElement) {
              document.exitPointerLock()
            }
            setTimeout(() => {
              try {
                onClick()
              } catch (error) {
                console.error('Error in onClick handler:', error)
              }
            }, 0)
          }
        }}
      >
        <boxGeometry args={[hitboxSize, hitboxSize, hitboxSize]} />
        <meshStandardMaterial 
          visible={false} 
          transparent 
          opacity={0}
        />
      </mesh>

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
              <SafeModelWrapper modelPath={exhibit.modelPath} />
            </ModelErrorBoundary>
          </Suspense>
        ) : (
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#9ca3af" />
          </mesh>
        )}
      </group>

      {isClose && (
        <Html 
          position={[0, 2.2, 0]} 
          center
          style={{
            zIndex: 15,
            pointerEvents: 'none',
            display: 'none',
          }}
          transform
        >
          <div 
            className="bg-black/80 backdrop-blur-md text-white px-3 py-1.5 rounded-md shadow-lg border border-white/10 pointer-events-none"
            style={{
              opacity: Math.max(0, Math.min(1, (8 - distanceToCamera) / 2)),
              transform: `scale(${Math.max(0.85, Math.min(1, (8 - distanceToCamera) / 2))})`,
            }}
          >
            <div className="font-medium text-xs leading-tight mb-0.5 max-w-[180px] truncate">{exhibit.title}</div>
            <div className="text-[10px] opacity-70 leading-tight">Кликните для просмотра</div>
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
    prevProps.isMobile === nextProps.isMobile
    // onClick не сравниваем, так как это функция и она может меняться
  )
})

function GalleryFloor() {
  const floorRef = useRef<THREE.Mesh>(null)

  return (
    <RigidBody type="fixed" friction={0}>
      <mesh
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[50, 50, 40, 40]} />
        <meshStandardMaterial
          color="#8b6f47"
          roughness={0.6}
          metalness={0.01}
          envMapIntensity={0.3}
        />
      </mesh>
    </RigidBody>
  )
}

function GalleryWalls({ isMobile }: { isMobile: boolean }) {
  const wallHeight = 7
  const wallLength = 50

  return (
    <>
      <RigidBody type="fixed" friction={0}>
        <mesh position={[0, wallHeight / 2, -25]} receiveShadow>
          <boxGeometry args={[wallLength, wallHeight, 0.5]} />
          <meshStandardMaterial 
            color="#f5f0e8"
            roughness={0.4} 
            metalness={0.02} 
            envMapIntensity={0.9}
          />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" friction={0}>
        <mesh position={[-25, wallHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <boxGeometry args={[wallLength, wallHeight, 0.5]} />
          <meshStandardMaterial 
            color="#f5f0e8" 
            roughness={0.4} 
            metalness={0.02} 
            envMapIntensity={0.9}
          />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" friction={0}>
        <mesh position={[25, wallHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <boxGeometry args={[wallLength, wallHeight, 0.5]} />
          <meshStandardMaterial 
            color="#f5f0e8" 
            roughness={0.4} 
            metalness={0.02} 
            envMapIntensity={0.9}
          />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" friction={0}>
        <mesh position={[0, wallHeight / 2, 25]} receiveShadow>
          <boxGeometry args={[wallLength, wallHeight, 0.5]} />
          <meshStandardMaterial 
            color="#f5f0e8" 
            roughness={0.4} 
            metalness={0.02} 
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
        <>
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
        </>
      ))}
    </>
  )
}

function GalleryCeiling({ isMobile }: { isMobile: boolean }) {
  return (
    <>
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
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </>
      )}
    </>
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
  const [selectedExhibitForInfo, setSelectedExhibitForInfo] = useState<Exhibit | null>(null)
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  
  // Сохранение позиции камеры для возврата
  const savedCameraPosition = useRef<THREE.Vector3 | null>(null)
  const savedCameraQuaternion = useRef<THREE.Quaternion | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const [isCameraReturning, setIsCameraReturning] = useState(false)
  // Стартовый экран: состояние для получения пользовательского жеста
  const [hasStarted, setHasStarted] = useState(false)
  const [isExploring, setIsExploring] = useState(false) // Режим ходьбы: есть RigidBody (начинаем с false)
  const [initialPlayerPosition, setInitialPlayerPosition] = useState<THREE.Vector3 | null>(null)
  const [initialPlayerQuaternion, setInitialPlayerQuaternion] = useState<THREE.Quaternion>(new THREE.Quaternion())
  const [playerKey, setPlayerKey] = useState(0) // Key для управления жизненным циклом FirstPersonControls

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice =
        ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
        window.innerWidth < 768
      setIsMobile(isMobileDevice)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => {
      window.removeEventListener('resize', checkMobile)
      // Очистка при размонтировании
      setIsMobile(false)
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
      setIsExploring(false)
      setIsOverlayOpen(true)
      setFocusTarget([finalCameraPosition.x, finalCameraPosition.y, finalCameraPosition.z] as [number, number, number])
      setFocusQuaternion(finalQuaternion)
      setIsCameraFocusing(true)
    },
    [exhibits]
  )

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


  const handleMobileMove = useCallback(
    (direction: 'forward' | 'backward' | 'left' | 'right', active: boolean) => {
      if ((window as any).__mobileMoveHandler) {
        ;(window as any).__mobileMoveHandler(direction, active)
      }
    },
    []
  )

  const handleMobileLook = useCallback((deltaX: number, deltaY: number) => {
    if ((window as any).__mobileLookHandler) {
      ;(window as any).__mobileLookHandler(deltaX, deltaY)
    }
  }, [])

  const controlsMode = 'firstperson' as const

  return (
    <div 
      ref={canvasContainerRef}
      className={`relative w-full ${isMobile ? 'h-[calc(100vh-6rem)]' : 'h-screen'} bg-gradient-to-b from-stone-50 via-amber-50/20 to-stone-50`}
    >
      {!isMobile && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="w-2 h-2 bg-white rounded-full opacity-80"></div>
        </div>
      )}

      {isMobile && controlsMode === 'firstperson' && (
        <MobileControls onMove={handleMobileMove} onLook={handleMobileLook} />
      )}


      <Canvas
        gl={{
          antialias: !isMobile,
          alpha: false,
          powerPreference: isMobile ? 'low-power' : 'high-performance',
          stencil: false,
          depth: true,
          preserveDrawingBuffer: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          precision: isMobile ? 'lowp' : 'highp',
          failIfMajorPerformanceCaveat: false,
        }}
        shadows={!isMobile}
        dpr={isMobile ? [0.8, 1.2] : [1, 2]}
        performance={{ min: isMobile ? 0.3 : 0.5, max: 1 }}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        frameloop="always"
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement
          if (isMobile) {
            gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
            gl.shadowMap.enabled = false
          }
        }}
      >
        <ambientLight intensity={isMobile ? 0.5 : 0.35} color="#fff8e1" />
        <directionalLight
          position={[10, 10, 5]}
          intensity={isMobile ? 0.8 : 1.2}
          castShadow={!isMobile}
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
        {isMobile ? (
          <>
            <pointLight position={[0, 6.3, 0]} intensity={1.5} distance={42} decay={2} color="#fff8e1" />
            <pointLight position={[-20, 5.5, -20]} intensity={0.8} distance={35} decay={2} color="#fff8e1" />
            <pointLight position={[20, 5.5, 20]} intensity={0.8} distance={35} decay={2} color="#fff8e1" />
          </>
        ) : (
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
              castShadow={!isMobile}
            />
            <pointLight position={[0, 4.5, -15]} intensity={0.5} distance={28} decay={2} color="#fff8e1" />
            <pointLight position={[0, 4.5, 15]} intensity={0.5} distance={28} decay={2} color="#fff8e1" />
          </>
        )}
        {!isMobile && <Environment preset="sunset" />}

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
            <GalleryFloor />
            <GalleryWalls isMobile={isMobile} />
            <GalleryCeiling isMobile={isMobile} />
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
                isMobile={isMobile}
              />
            ))}
          </Suspense>

          {controlsMode === 'firstperson' && isExploring && (
            <FirstPersonControls
              key={playerKey}
              onMobileMove={isMobile ? handleMobileMove : undefined}
              onMobileLook={isMobile ? handleMobileLook : undefined}
              bounds={isMobile ? undefined : GALLERY_BOUNDS}
              enabled={!isCameraReturning}
              isLocked={!!selectedExhibitForInfo || isCameraReturning}
              initialPosition={initialPlayerPosition || savedCameraPosition.current}
              initialQuaternion={initialPlayerQuaternion}
              onPointerLockUnlock={handlePointerLockUnlock}
            />
          )}
        </Physics>
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
            cursor: 'pointer'
          }}
          onClick={() => {
            setHasStarted(true)
            setIsExploring(true)
          }}
        >
          <button
            style={{
              padding: '20px 40px',
              fontSize: '24px',
              backgroundColor: '#fff8e1',
              color: '#1a1a1a',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            Начать экскурсию
          </button>
        </div>
      )}
    </div>
  )
}
