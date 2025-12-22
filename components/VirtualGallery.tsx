'use client'

import React, { Suspense, useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, Html } from '@react-three/drei'
import * as THREE from 'three'
import { Exhibit } from '@/types/exhibit'
import { useRouter } from 'next/navigation'
import SafeModelWrapper from './SafeModel'
import FirstPersonControls from './FirstPersonControls'
import MobileControls from './MobileControls'

// Простой ErrorBoundary для обработки ошибок загрузки моделей
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

interface VirtualGalleryProps {
  exhibits: Exhibit[]
}

// Компонент для одного экспоната в галерее
function ExhibitInSpace({ 
  exhibit, 
  position, 
  onClick, 
  isHovered, 
  onHover 
}: { 
  exhibit: Exhibit; 
  position: [number, number, number]; 
  onClick: () => void;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
}) {
  const meshRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (meshRef.current && !isHovered) {
      // Оптимизация: обновляем только если не наведена мышь
      // Используем более легкое вычисление
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })

  const touchStartTime = useRef<number | null>(null)
  const touchMoved = useRef<boolean>(false)
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  return (
    <group
      ref={meshRef}
      position={position}
    >
      {/* Невидимая область для наведения - охватывает весь экспонат */}
      <mesh
        position={[0, 1, 0]}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(true)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          onHover(false)
        }}
        onPointerEnter={(e) => {
          e.stopPropagation()
          onHover(true)
        }}
        onPointerLeave={(e) => {
          e.stopPropagation()
          onHover(false)
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
          onHover(true)
          // Запоминаем время начала касания для мобильных
          if (isTouchDevice) {
            touchStartTime.current = Date.now()
            touchMoved.current = false
          }
        }}
        onPointerMove={(e) => {
          // Если есть движение, это не клик
          if (isTouchDevice && touchStartTime.current !== null) {
            touchMoved.current = true
          }
        }}
        onPointerUp={(e) => {
          e.stopPropagation()
          // Простая проверка: если это было быстрое касание без движения - это клик
          if (isTouchDevice && touchStartTime.current !== null) {
            const deltaTime = Date.now() - touchStartTime.current
            // Если касание было быстрым (менее 500ms) и без движения - это клик
            if (deltaTime < 500 && !touchMoved.current) {
              onClick()
            }
            touchStartTime.current = null
            touchMoved.current = false
          } else if (!isTouchDevice) {
            // Для десктопа - обычный клик
            onClick()
          }
        }}
        onClick={(e) => {
          // Резервный обработчик для десктопа
          e.stopPropagation()
          if (!isTouchDevice) {
            onClick()
          }
        }}
      >
        <boxGeometry args={[4, 4, 4]} />
        <meshStandardMaterial 
          visible={false}
          transparent
          opacity={0}
        />
      </mesh>
      
      {/* Пьедестал или подставка */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.3, 16]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>

      {/* 3D модель экспоната - позиционируем над пьедесталом */}
      <group position={[0, 0, 0]}>
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
          // Заглушка если нет модели
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#9ca3af" />
          </mesh>
        )}
      </group>

      {/* Табличка с названием - фиксированная высота над пьедесталом */}
      {isHovered && (
        <Html position={[0, 2.5, 0]} center>
          <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-xl border-2 border-primary-500 min-w-[200px]">
            <h3 className="font-bold text-gray-800 text-sm">{exhibit.title}</h3>
            {exhibit.studentName && (
              <p className="text-xs text-gray-600 mt-1">Автор: {exhibit.studentName}</p>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onClick()
              }}
              onTouchStart={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              onTouchEnd={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onClick()
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              className="mt-2 w-full bg-primary-600 text-white text-xs py-2.5 rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-colors font-semibold shadow-md touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              Просмотреть
            </button>
          </div>
        </Html>
      )}

    </group>
  )
}



// Компонент пола галереи
function GalleryFloor() {
  return (
    <group>
      {/* Основной пол - паркетный вид */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100, 20, 20]} />
        <meshStandardMaterial 
          color="#e8e5e0" 
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
      {/* Плинтус по периметру */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[48, 50, 64]} />
        <meshStandardMaterial color="#d4d1cc" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// Стены галереи
function GalleryWalls() {
  const wallHeight = 8
  const wallLength = 50
  const wallThickness = 0.3

  return (
    <>
      {/* Задняя стена */}
      <group position={[0, wallHeight / 2, -wallLength / 2]}>
        <mesh receiveShadow>
          <boxGeometry args={[wallLength, wallHeight, wallThickness]} />
          <meshStandardMaterial color="#fafafa" roughness={0.4} />
        </mesh>
        {/* Карниз сверху */}
        <mesh position={[0, wallHeight / 2, 0]}>
          <boxGeometry args={[wallLength, 0.2, 0.4]} />
          <meshStandardMaterial color="#e5e5e5" />
        </mesh>
        {/* Плинтус снизу */}
        <mesh position={[0, -wallHeight / 2, 0]}>
          <boxGeometry args={[wallLength, 0.15, 0.35]} />
          <meshStandardMaterial color="#d4d1cc" />
        </mesh>
      </group>
      
      {/* Левая стена */}
      <group position={[-wallLength / 2, wallHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[wallLength, wallHeight, wallThickness]} />
          <meshStandardMaterial color="#fafafa" roughness={0.4} />
        </mesh>
        {/* Карниз сверху */}
        <mesh position={[0, wallHeight / 2, 0]}>
          <boxGeometry args={[wallLength, 0.2, 0.4]} />
          <meshStandardMaterial color="#e5e5e5" />
        </mesh>
        {/* Плинтус снизу */}
        <mesh position={[0, -wallHeight / 2, 0]}>
          <boxGeometry args={[wallLength, 0.15, 0.35]} />
          <meshStandardMaterial color="#d4d1cc" />
        </mesh>
      </group>
      
      {/* Правая стена */}
      <group position={[wallLength / 2, wallHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[wallLength, wallHeight, wallThickness]} />
          <meshStandardMaterial color="#fafafa" roughness={0.4} />
        </mesh>
        {/* Карниз сверху */}
        <mesh position={[0, wallHeight / 2, 0]}>
          <boxGeometry args={[wallLength, 0.2, 0.4]} />
          <meshStandardMaterial color="#e5e5e5" />
        </mesh>
        {/* Плинтус снизу */}
        <mesh position={[0, -wallHeight / 2, 0]}>
          <boxGeometry args={[wallLength, 0.15, 0.35]} />
          <meshStandardMaterial color="#d4d1cc" />
        </mesh>
      </group>
      
      {/* Передняя стена (сзади камеры) */}
      <group position={[0, wallHeight / 2, wallLength / 2]}>
        <mesh receiveShadow>
          <boxGeometry args={[wallLength, wallHeight, wallThickness]} />
          <meshStandardMaterial color="#fafafa" roughness={0.4} />
        </mesh>
        {/* Карниз сверху */}
        <mesh position={[0, wallHeight / 2, 0]}>
          <boxGeometry args={[wallLength, 0.2, 0.4]} />
          <meshStandardMaterial color="#e5e5e5" />
        </mesh>
        {/* Плинтус снизу */}
        <mesh position={[0, -wallHeight / 2, 0]}>
          <boxGeometry args={[wallLength, 0.15, 0.35]} />
          <meshStandardMaterial color="#d4d1cc" />
        </mesh>
      </group>
    </>
  )
}

// Потолок галереи
function GalleryCeiling() {
  return (
    <group>
      {/* Основной потолок */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 8, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.3} />
      </mesh>
      {/* Декоративные балки/карнизы */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 7.9, 0]}>
        <ringGeometry args={[48, 50, 64]} />
        <meshStandardMaterial color="#e5e5e5" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export default function VirtualGallery({ exhibits }: VirtualGalleryProps) {
  const router = useRouter()
  const [controlsMode, setControlsMode] = useState<'orbit' | 'firstperson'>('firstperson')
  const [hoveredExhibitId, setHoveredExhibitId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = 
        ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
        window.innerWidth < 768
      setIsMobile(isMobileDevice)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Размещаем экспонаты в пространстве (сетка)
  // Используем useMemo для стабильности позиций
  const positions = useMemo(() => {
    const positions: [number, number, number][] = []
    const spacing = 6 // Увеличиваем расстояние между экспонатами
    const rows = Math.ceil(Math.sqrt(exhibits.length))
    
    for (let i = 0; i < exhibits.length; i++) {
      const row = Math.floor(i / rows)
      const col = i % rows
      const x = (col - (rows - 1) / 2) * spacing // Центрируем по X
      const z = -row * spacing - 5 // Размещаем вглубь
      positions.push([x, 0, z])
    }
    
    return positions
  }, [exhibits.length])

  const handleExhibitClick = (exhibitId: string) => {
    router.push(`/exhibit/${exhibitId}`)
  }

  // Обработчики для мобильного управления
  const handleMobileMove = (direction: 'forward' | 'backward' | 'left' | 'right', active: boolean) => {
    if ((window as any).__mobileMoveHandler) {
      ;(window as any).__mobileMoveHandler(direction, active)
    }
  }

  const handleMobileLook = (deltaX: number, deltaY: number) => {
    if ((window as any).__mobileLookHandler) {
      ;(window as any).__mobileLookHandler(deltaX, deltaY)
    }
  }

  return (
    <div className="relative w-full h-screen bg-gray-100">
      {/* Указатель по центру экрана (только для десктопа) */}
      {!isMobile && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className="relative">
            {/* Центральная точка */}
            <div className="w-2 h-2 rounded-full bg-gray-800/60 border border-gray-600/40 shadow-lg"></div>
            {/* Горизонтальная линия */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-px bg-gray-800/40"></div>
            {/* Вертикальная линия */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-px bg-gray-800/40"></div>
          </div>
        </div>
      )}

      {/* Мобильные контролы */}
      {isMobile && controlsMode === 'firstperson' && (
        <MobileControls onMove={handleMobileMove} onLook={handleMobileLook} />
      )}

      <Canvas
        gl={{ 
          antialias: !isMobile, // Отключаем антиалиасинг на мобильных для производительности
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true
        }}
        shadows={false} // Отключаем тени для производительности
        dpr={isMobile ? [1, 1.2] : [1, 1.5]} // Меньший pixel ratio на мобильных
        performance={{ min: 0.5 }} // Минимальный FPS
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
      >
        {/* Освещение - галерейное мягкое освещение */}
        <ambientLight intensity={0.6} />
        {/* Основной источник света */}
        <directionalLight
          position={[10, 8, 5]}
          intensity={0.8}
          castShadow={false}
        />
        {/* Дополнительное освещение для равномерности */}
        <directionalLight
          position={[-10, 8, -5]}
          intensity={0.4}
          castShadow={false}
        />
        {/* Верхнее освещение (как в галереях) */}
        <pointLight position={[0, 7, 0]} intensity={0.5} distance={30} decay={2} />
        <pointLight position={[-15, 7, -15]} intensity={0.3} distance={25} decay={2} />
        <pointLight position={[15, 7, -15]} intensity={0.3} distance={25} decay={2} />
        <Environment preset="city" />

        {/* Камера */}
        <PerspectiveCamera makeDefault position={[0, 2, 10]} fov={75} />

        {/* Пол, стены и потолок */}
        <GalleryFloor />
        <GalleryWalls />
        <GalleryCeiling />

        {/* Экспонаты */}
        {exhibits.map((exhibit, index) => (
          <ExhibitInSpace
            key={exhibit.id}
            exhibit={exhibit}
            position={positions[index]}
            onClick={() => handleExhibitClick(exhibit.id)}
            isHovered={hoveredExhibitId === exhibit.id}
            onHover={(hovered) => {
              if (hovered) {
                setHoveredExhibitId(exhibit.id)
              } else if (hoveredExhibitId === exhibit.id) {
                setHoveredExhibitId(null)
              }
            }}
          />
        ))}

        {/* Управление камерой */}
        {controlsMode === 'orbit' ? (
          <OrbitControls
            enableZoom={true}
            enablePan={true}
            minDistance={0.5}
            maxDistance={50}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2}
            touches={{
              ONE: isMobile ? THREE.TOUCH.ROTATE : THREE.TOUCH.ROTATE,
              TWO: isMobile ? THREE.TOUCH.DOLLY_PAN : THREE.TOUCH.DOLLY_PAN,
            }}
          />
        ) : (
          <FirstPersonControls 
            onMobileMove={isMobile ? handleMobileMove : undefined}
            onMobileLook={isMobile ? handleMobileLook : undefined}
          />
        )}
      </Canvas>
    </div>
  )
}

