'use client'

import React, { Suspense, useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, Html, useGLTF, Effects } from '@react-three/drei'
import * as THREE from 'three'
import { Exhibit } from '@/types/exhibit'
import { useRouter } from 'next/navigation'
import SafeModelWrapper from './SafeModel'
import FirstPersonControls from './FirstPersonControls'
import MobileControls from './MobileControls'

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

function ExhibitInSpace({
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
    }
  }, [])
  
  const isClose = distanceToCamera < 8 && distanceToCamera !== Infinity

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
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
                setTimeout(() => {
                  try {
                    onClick()
                  } catch (error) {
                    console.error('Error in onClick handler:', error)
                  }
                }, 100)
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
            }, 100)
          }
        }}
      >
        <boxGeometry args={[3, 3, 3]} />
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
}

function GalleryFloor() {
  const floorRef = useRef<THREE.Mesh>(null)

  return (
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
  )
}

function GalleryWalls({ isMobile }: { isMobile: boolean }) {
  const wallHeight = 7
  const wallLength = 50

  return (
    <>
      <mesh position={[0, wallHeight / 2, -25]} receiveShadow>
        <boxGeometry args={[wallLength, wallHeight, 0.5]} />
        <meshStandardMaterial 
          color="#f5f0e8"
          roughness={0.4} 
          metalness={0.02} 
          envMapIntensity={0.9}
        />
      </mesh>
      <mesh position={[-25, wallHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[wallLength, wallHeight, 0.5]} />
        <meshStandardMaterial 
          color="#f5f0e8" 
          roughness={0.4} 
          metalness={0.02} 
          envMapIntensity={0.9}
        />
      </mesh>
      <mesh position={[25, wallHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[wallLength, wallHeight, 0.5]} />
        <meshStandardMaterial 
          color="#f5f0e8" 
          roughness={0.4} 
          metalness={0.02} 
          envMapIntensity={0.9}
        />
      </mesh>
      <mesh position={[0, wallHeight / 2, 25]} receiveShadow>
        <boxGeometry args={[wallLength, wallHeight, 0.5]} />
        <meshStandardMaterial 
          color="#f5f0e8" 
          roughness={0.4} 
          metalness={0.02} 
          envMapIntensity={0.9}
        />
      </mesh>
      
      {[-25, 25].map((x) => (
        <mesh 
          key={`plinth-x-${x}`} 
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
      ))}
      {[-25, 25].map((z) => (
        <mesh 
          key={`plinth-z-${z}`} 
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

function CameraBounds({ isOrbitMode, isMobile }: { isOrbitMode: boolean; isMobile: boolean }) {
  const { camera } = useThree()

  useFrame(() => {
    if (!isOrbitMode || !isMobile) {
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
    }
  })
  return null
}

export default function VirtualGallery({ exhibits }: VirtualGalleryProps) {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const canvasContainerRef = useRef<HTMLDivElement>(null)

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

  const handleExhibitClick = useCallback(
    (exhibitId: string) => {
      if (!exhibitId || typeof exhibitId !== 'string') {
        console.warn('Invalid exhibit ID:', exhibitId)
        return
      }
      try {
        router.push(`/exhibit/${exhibitId}`)
      } catch (error) {
        console.error('Error navigating to exhibit:', error)
      }
    },
    [router]
  )


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

        <CameraBounds isOrbitMode={false} isMobile={isMobile} />

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
              onClick={() => handleExhibitClick(exhibit.id)}
              isMobile={isMobile}
            />
          ))}
        </Suspense>

        {controlsMode === 'firstperson' && (
          <FirstPersonControls
            onMobileMove={isMobile ? handleMobileMove : undefined}
            onMobileLook={isMobile ? handleMobileLook : undefined}
            bounds={isMobile ? undefined : GALLERY_BOUNDS}
          />
        )}
      </Canvas>
    </div>
  )
}
