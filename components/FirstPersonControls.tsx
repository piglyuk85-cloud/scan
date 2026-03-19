'use client'

import { useRef, useEffect, useMemo, type MutableRefObject } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import * as THREE from 'three'

interface FirstPersonControlsProps {
  mobileMoveStateRef?: MutableRefObject<{
    forward: boolean
    backward: boolean
    left: boolean
    right: boolean
  }>
  mobileMoveVectorRef?: MutableRefObject<{ x: number; y: number; active: boolean }>
  mobileLookDeltaRef?: MutableRefObject<{ x: number; y: number }>
  bounds?: {
    minX: number
    maxX: number
    minZ: number
    maxZ: number
    minY: number
    maxY: number
  }
  enabled?: boolean
  onRigidBodyReady?: (rigidBodyRef: React.MutableRefObject<any>) => void
  isLocked?: boolean
  initialPosition?: THREE.Vector3 | null
  initialQuaternion?: THREE.Quaternion | null
  onPointerLockUnlock?: () => void // Callback для синхронизации состояния при разблокировке
}

const PI_2 = Math.PI / 2
const MOVE_SPEED = 8.0
const JUMP_STRENGTH = 8.0
const GROUND_CHECK_DISTANCE = 0.1

// View Bobbing параметры
const BOBBING_AMPLITUDE = 0.08 // Амплитуда покачивания (небольшая, чтобы не вызвать морскую болезнь)
const BOBBING_SPEED = 12.0 // Скорость покачивания (зависит от скорости движения)
const BOBBING_MIN_VELOCITY = 0.1 // Минимальная скорость для активации покачивания

// Сглаживание камеры
const CAMERA_LERP_FACTOR = 0.15 // Фактор сглаживания вращения камеры (0-1, чем меньше - тем плавнее)
const POSITION_LERP_FACTOR = 0.1 // Сглаживание позиции камеры для фильтрации физического микродрожания

// Эффект приземления
const LANDING_DURATION = 0.3 // Длительность эффекта приземления в секундах
const LANDING_AMPLITUDE = 0.15 // Амплитуда "приседания" при приземлении

export default function FirstPersonControls({ 
  mobileMoveStateRef,
  mobileMoveVectorRef,
  mobileLookDeltaRef,
  bounds,
  enabled = true,
  onRigidBodyReady,
  isLocked = false,
  initialPosition = null,
  initialQuaternion = null,
  onPointerLockUnlock
}: FirstPersonControlsProps = {}) {
  const { camera, gl } = useThree()
  const moveForward = useRef(false)
  const moveBackward = useRef(false)
  const moveLeft = useRef(false)
  const moveRight = useRef(false)
  const jumpPressed = useRef(false)
  
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const targetEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ')) // Для сглаживания
  const rigidBodyRef = useRef<any>(null)
  const isInitialized = useRef(false)
  const lastInitialPosition = useRef<THREE.Vector3 | null>(null)
  const spawnCounter = useRef(0) // Счетчик для принудительной фиксации позиции после спавна

  // View Bobbing состояние
  const bobbingTime = useRef(0)
  const baseCameraY = useRef(0) // Базовая высота камеры без покачивания
  const wasGrounded = useRef(true)
  const previousLinvelY = useRef(0)

  // Эффект приземления
  const landingTime = useRef(0)
  const isLanding = useRef(false)

  // Оптимизация: переиспользуем векторы вместо создания новых на каждом кадре
  const forwardVector = useMemo(() => new THREE.Vector3(), [])
  const rightVector = useMemo(() => new THREE.Vector3(), [])
  const velocityVector = useMemo(() => new THREE.Vector3(), [])
  const targetPositionRef = useRef(new THREE.Vector3())

  useEffect(() => {
    let isPointerLocked = false
    let lastMouseX = 0
    let lastMouseY = 0
    let isMouseDown = false

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }
      
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          moveForward.current = true
          break
        case 'KeyS':
        case 'ArrowDown':
          moveBackward.current = true
          break
        case 'KeyA':
        case 'ArrowLeft':
          moveLeft.current = true
          break
        case 'KeyD':
        case 'ArrowRight':
          moveRight.current = true
          break
        case 'Space':
          event.preventDefault()
          jumpPressed.current = true
          break
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          moveForward.current = false
          break
        case 'KeyS':
        case 'ArrowDown':
          moveBackward.current = false
          break
        case 'KeyA':
        case 'ArrowLeft':
          moveLeft.current = false
          break
        case 'KeyD':
        case 'ArrowRight':
          moveRight.current = false
          break
        case 'Space':
          jumpPressed.current = false
          break
      }
    }

    const onPointerLockChange = () => {
      const wasLocked = isPointerLocked
      isPointerLocked = document.pointerLockElement === gl.domElement
      
      // Устранение "залипания" ESC: синхронизируем состояние при разблокировке
      if (wasLocked && !isPointerLocked) {
        gl.domElement.style.cursor = 'default'
        // Вызываем callback для синхронизации состояния в родительском компоненте
        if (onPointerLockUnlock) {
          onPointerLockUnlock()
        }
      }
    }

    const requestPointerLock = () => {
      gl.domElement.requestPointerLock().catch(() => {
        console.log('Pointer Lock не поддерживается, используем альтернативный метод')
      })
    }

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target && (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('[data-html]')
      )) {
        return
      }
      
      if (event.target !== gl.domElement && !gl.domElement.contains(event.target as Node)) {
        return
      }
      
      if (event.button === 0) {
        isMouseDown = true
        lastMouseX = event.clientX
        lastMouseY = event.clientY
        gl.domElement.style.cursor = 'none'
        requestPointerLock()
      }
    }

    const handleMouseUp = (event: MouseEvent) => {
      if (event.target !== gl.domElement && !gl.domElement.contains(event.target as Node)) {
        return
      }
      isMouseDown = false
      gl.domElement.style.cursor = 'default'
    }

    const handleMouseMove = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target && (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]')
      )) {
        if (isPointerLocked) {
          document.exitPointerLock()
        }
        return
      }

      if (isPointerLocked) {
        const movementX = event.movementX || 0
        const movementY = event.movementY || 0

        // Обновляем targetEuler для сглаживания
        targetEuler.current.setFromQuaternion(camera.quaternion)
        targetEuler.current.y -= movementX * 0.002
        targetEuler.current.x -= movementY * 0.002
        targetEuler.current.x = Math.max(-PI_2, Math.min(PI_2, targetEuler.current.x))
      } else if (isMouseDown) {
        const deltaX = event.clientX - lastMouseX
        const deltaY = event.clientY - lastMouseY

        // Обновляем targetEuler для сглаживания
        targetEuler.current.setFromQuaternion(camera.quaternion)
        targetEuler.current.y -= deltaX * 0.002
        targetEuler.current.x -= deltaY * 0.002
        targetEuler.current.x = Math.max(-PI_2, Math.min(PI_2, targetEuler.current.x))

        lastMouseX = event.clientX
        lastMouseY = event.clientY
      }
    }

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target && (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('[data-html]')
      )) {
        if (document.pointerLockElement) {
          document.exitPointerLock()
        }
      }
    }

    const handleEsc = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && document.pointerLockElement) {
        document.exitPointerLock()
      }
    }

    gl.domElement.addEventListener('mousedown', handleMouseDown, true)
    gl.domElement.addEventListener('mouseup', handleMouseUp, true)
    gl.domElement.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('pointerlockchange', onPointerLockChange)
    document.addEventListener('click', handleDocumentClick, true)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    document.addEventListener('keydown', handleEsc)

    return () => {
      gl.domElement.removeEventListener('mousedown', handleMouseDown, true)
      gl.domElement.removeEventListener('mouseup', handleMouseUp, true)
      gl.domElement.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      document.removeEventListener('click', handleDocumentClick, true)
      document.removeEventListener('keydown', handleEsc)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [camera, gl])

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    
    // ОЧЕНЬ ВАЖНО: Устанавливаем углы поворота из initialQuaternion при монтировании компонента
    // Это должно произойти ДО того, как контроллер начнет работать в useFrame
    if (initialQuaternion) {
      const tempEuler = new THREE.Euler().setFromQuaternion(initialQuaternion, 'YXZ')
      // ОЧЕНЬ ВАЖНО: Мы должны обновить именно те переменные, 
      // которые контроллер использует в useFrame для вращения камеры.
      euler.current.y = tempEuler.y // Это поворот влево-вправо (Yaw)
      euler.current.x = tempEuler.x // Это поворот вверх-вниз (Pitch)
      euler.current.z = tempEuler.z // Roll (обычно не используется)
      
      // Также обновляем targetEuler для сглаживания
      targetEuler.current.y = tempEuler.y
      targetEuler.current.x = tempEuler.x
      targetEuler.current.z = tempEuler.z
      
      // Устанавливаем quaternion камеры напрямую
      camera.quaternion.copy(initialQuaternion)
      
      console.log('APPLYING ROTATION ON MOUNT:', {
        euler: { x: tempEuler.x, y: tempEuler.y, z: tempEuler.z },
        quaternion: initialQuaternion
      })
    }
    
    // Сброс инициализации при размонтировании для корректного remount
    return () => {
      isMountedRef.current = false
      isInitialized.current = false
      lastInitialPosition.current = null
      spawnCounter.current = 0
    }
  }, [initialQuaternion, camera])

  // Инициализация позиции при монтировании RigidBody
  // Критически важно: Если RigidBody только что создался (mount), он должен немедленно вызвать setTranslation(initialPosition, true)
  useEffect(() => {
    if (rigidBodyRef.current) {
      // Проверка: если initialPosition изменился, принудительно перемещаемся
      const positionChanged = initialPosition && (
        !lastInitialPosition.current ||
        initialPosition.x !== lastInitialPosition.current.x ||
        initialPosition.y !== lastInitialPosition.current.y ||
        initialPosition.z !== lastInitialPosition.current.z
      )
      
      // Используем initialPosition если передан, иначе дефолтную позицию
      if (initialPosition) {
        // Проверка: если initialPosition равен {x:0, y:0, z:0} (или близок к нулю), не даем игроку спавниться
        const isZeroPosition = Math.abs(initialPosition.x) < 0.1 && 
                               Math.abs(initialPosition.y) < 0.1 && 
                               Math.abs(initialPosition.z) < 0.1
        
        if (isZeroPosition) {
          console.warn('SPAWN POSITION: Zero position detected, waiting for real coordinates', initialPosition)
          return // Не спавнимся, пока не придут реальные координаты
        }
        
        // Если RigidBody только что создался или initialPosition изменился, принудительно перемещаемся
        if (!isInitialized.current || positionChanged) {
          // Логирование для отладки
          console.log('SPAWN POSITION:', initialPosition)
          
          // Немедленно вызываем setTranslation с флагом true для телепортации
          rigidBodyRef.current.setTranslation({ 
            x: initialPosition.x, 
            y: initialPosition.y, 
            z: initialPosition.z 
          }, true)
          // Сбрасываем скорость для предотвращения "дергания"
          rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
          rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
          camera.position.set(initialPosition.x, initialPosition.y, initialPosition.z)
          baseCameraY.current = initialPosition.y
          
          // Исправление вращения: PointerLockControls часто перезаписывает camera.quaternion
          // Преобразуем Quaternion в углы Эйлера и устанавливаем их в контроллер
          // ОЧЕНЬ ВАЖНО: Обновляем именно те переменные, которые контроллер использует в useFrame
          if (initialQuaternion) {
            const eulerFromQuat = new THREE.Euler().setFromQuaternion(initialQuaternion, 'YXZ')
            euler.current.y = eulerFromQuat.y // Yaw
            euler.current.x = eulerFromQuat.x // Pitch
            euler.current.z = eulerFromQuat.z // Roll
            
            // Также обновляем targetEuler для сглаживания
            targetEuler.current.y = eulerFromQuat.y
            targetEuler.current.x = eulerFromQuat.x
            targetEuler.current.z = eulerFromQuat.z
            
            camera.quaternion.setFromEuler(euler.current)
          }
          
          isInitialized.current = true
          lastInitialPosition.current = initialPosition.clone()
          // Сбрасываем счетчик спавна для принудительной фиксации
          spawnCounter.current = 0
        }
      } else if (!isInitialized.current) {
        // Дефолтная позиция только при первом монтировании
        const initialY = bounds ? Math.max(bounds.minY, 1.6) : 1.6
        rigidBodyRef.current.setTranslation({ x: 0, y: initialY, z: 10 }, true)
        // Сброс скоростей в FirstPersonControls: при старте (mount) сбрасываем все скорости
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
        camera.position.set(0, initialY, 10)
        baseCameraY.current = initialY
        isInitialized.current = true
        lastInitialPosition.current = null
      }
    }
    // Уведомляем родительский компонент о готовности RigidBody
    if (rigidBodyRef.current && onRigidBodyReady) {
      onRigidBodyReady(rigidBodyRef)
    }
  }, [camera, bounds, onRigidBodyReady, initialPosition, initialQuaternion])

  // Авто-фокус (Разморозка): автоматический вызов controls.lock() при монтировании
  useEffect(() => {
    if (!isLocked && enabled && gl.domElement) {
      // Пытаемся программно вызвать requestPointerLock
      // Если браузер блокирует авто-лок без клика, это будет проигнорировано
      const attemptAutoLock = () => {
        if (document.pointerLockElement !== gl.domElement) {
          gl.domElement.requestPointerLock().catch(() => {
            // Браузер блокирует авто-лок - это нормально, пользователь должен кликнуть
            console.log('Auto-lock blocked by browser, user interaction required')
          })
        }
      }
      
      // Пробуем сразу и с небольшой задержкой
      attemptAutoLock()
      const timeoutId = setTimeout(attemptAutoLock, 100)
      
      return () => {
        clearTimeout(timeoutId)
      }
    }
  }, [isLocked, enabled, gl.domElement])

  useFrame((state, delta) => {
    // Guard Clause: Мгновенная остановка всех вычислений, включая lerp, если управление заблокировано
    if (isLocked) return
    
    if (!isMountedRef.current || !rigidBodyRef.current || !enabled) return

    // Мобильные инпуты приходят напрямую через refs (без глобальных window-хендлеров)
    if (mobileMoveStateRef?.current) {
      moveForward.current = mobileMoveStateRef.current.forward
      moveBackward.current = mobileMoveStateRef.current.backward
      moveLeft.current = mobileMoveStateRef.current.left
      moveRight.current = mobileMoveStateRef.current.right
    }

    if (mobileLookDeltaRef?.current) {
      const deltaX = mobileLookDeltaRef.current.x
      const deltaY = mobileLookDeltaRef.current.y
      if (deltaX !== 0 || deltaY !== 0) {
        targetEuler.current.setFromQuaternion(camera.quaternion)
        targetEuler.current.y -= deltaX * 0.002
        targetEuler.current.x -= deltaY * 0.002
        targetEuler.current.x = Math.max(-PI_2, Math.min(PI_2, targetEuler.current.x))
        mobileLookDeltaRef.current.x = 0
        mobileLookDeltaRef.current.y = 0
      }
    }

    // Отключение синхронизации: если enabled=false, не вызываем методы rigidBody
    // Это предотвращает ошибки "recursive use of an object" и "expected instance of m"
    if (!enabled) {
      return
    }

    // Принудительный Null-check: жесткая проверка валидности RigidBody
    // Если rigidBody не прошел проверку isValid(), вообще не входим в логику useFrame
    const rigidBody = rigidBodyRef.current
    if (!rigidBody || !rigidBody.handle || rigidBody.handle === null || rigidBody.handle === undefined) {
      return
    }

    // Логика принудительного спавна: фиксируем игрока в нужной точке на первые 10 кадров
    if (spawnCounter.current < 10 && rigidBody && initialPosition) {
      // Проверка на нулевую позицию
      const isZeroPosition = Math.abs(initialPosition.x) < 0.1 && 
                             Math.abs(initialPosition.y) < 0.1 && 
                             Math.abs(initialPosition.z) < 0.1
      
      if (!isZeroPosition) {
        rigidBody.setTranslation({
          x: initialPosition.x,
          y: initialPosition.y,
          z: initialPosition.z
        }, true)
        rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true)
        rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true)
        
        // Применение вращения (Quaternion): восстанавливаем направление взгляда
        // Важно: RigidBody в Rapier обычно не вращается по осям X и Z, поэтому вращение применяем к камере
        // Это дополнительная установка на случай, если камера была сброшена
        if (initialQuaternion) {
          const tempEuler = new THREE.Euler().setFromQuaternion(initialQuaternion, 'YXZ')
          euler.current.y = tempEuler.y
          euler.current.x = tempEuler.x
          euler.current.z = tempEuler.z
          targetEuler.current.y = tempEuler.y
          targetEuler.current.x = tempEuler.x
          targetEuler.current.z = tempEuler.z
          camera.quaternion.copy(initialQuaternion)
        }
        
        spawnCounter.current += 1
      }
    }

    // Сглаживание вращения камеры (lerp)
    // Обернуто в проверку isLocked, чтобы гарантировать, что даже если компонент еще не размонтировался, он не тронет камеру
    if (!isLocked) {
      euler.current.x = THREE.MathUtils.lerp(euler.current.x, targetEuler.current.x, CAMERA_LERP_FACTOR)
      euler.current.y = THREE.MathUtils.lerp(euler.current.y, targetEuler.current.y, CAMERA_LERP_FACTOR)
      euler.current.z = THREE.MathUtils.lerp(euler.current.z, targetEuler.current.z, CAMERA_LERP_FACTOR)
      camera.quaternion.setFromEuler(euler.current)
    }

    // Получаем текущую скорость для сохранения вертикальной компоненты (гравитация)
    // Безопасный доступ: используем проверенный rigidBody
    const currentLinvel = rigidBody.linvel()
    
    // Проверка приземления: если скорость Y изменилась с отрицательной на положительную/нулевую
    const isGrounded = Math.abs(currentLinvel.y) < 0.1
    const wasFalling = previousLinvelY.current < -0.5
    if (wasFalling && isGrounded && !wasGrounded.current) {
      // Приземление! Запускаем эффект
      landingTime.current = LANDING_DURATION
      isLanding.current = true
    }
    wasGrounded.current = isGrounded
    previousLinvelY.current = currentLinvel.y

    // Обновляем эффект приземления
    if (isLanding.current && landingTime.current > 0) {
      landingTime.current -= delta
      if (landingTime.current <= 0) {
        isLanding.current = false
      }
    }
    
    // Вычисляем направление движения на основе взгляда камеры
    // Инвертируем forward, так как в Three.js камера смотрит по отрицательной Z-оси
    let forward = Number(moveBackward.current) - Number(moveForward.current)
    let right = Number(moveRight.current) - Number(moveLeft.current)

    if (mobileMoveVectorRef?.current?.active) {
      forward = -mobileMoveVectorRef.current.y
      right = mobileMoveVectorRef.current.x
    }

    // Обнуляем вектор скорости для горизонтального движения
    velocityVector.set(0, 0, 0)

    // Вычисляем вектор вперед/назад на основе направления взгляда камеры
    if (forward !== 0) {
      forwardVector.setFromMatrixColumn(camera.matrix, 2)
      forwardVector.y = 0 // Обнуляем вертикальную компоненту для движения по горизонтали
      forwardVector.normalize()
      forwardVector.multiplyScalar(forward * MOVE_SPEED)
      velocityVector.add(forwardVector)
    }

    // Вычисляем вектор влево/вправо на основе направления взгляда камеры
    if (right !== 0) {
      rightVector.setFromMatrixColumn(camera.matrix, 0)
      rightVector.y = 0 // Обнуляем вертикальную компоненту для движения по горизонтали
      rightVector.normalize()
      rightVector.multiplyScalar(right * MOVE_SPEED)
      velocityVector.add(rightVector)
    }

    // Вычисляем горизонтальную скорость для view bobbing и звуков
    const horizontalVelocity = Math.sqrt(velocityVector.x * velocityVector.x + velocityVector.z * velocityVector.z)
    const isMoving = horizontalVelocity > BOBBING_MIN_VELOCITY && isGrounded

    // View Bobbing: покачивание камеры при ходьбе
    if (isMoving) {
      bobbingTime.current += delta * BOBBING_SPEED * (horizontalVelocity / MOVE_SPEED)
      baseCameraY.current = rigidBody.translation().y
    } else {
      // Плавно возвращаем камеру в исходное положение
      bobbingTime.current = 0
    }

    // Проверка на прыжок: проверяем, стоит ли персонаж на земле
    let newY = currentLinvel.y
    if (jumpPressed.current) {
      // Проверяем, близко ли к земле (простая проверка по скорости Y)
      // Если скорость Y близка к нулю или отрицательна (падает), значит на земле
      if (Math.abs(currentLinvel.y) < 0.1) {
        newY = JUMP_STRENGTH
        jumpPressed.current = false // Сбрасываем флаг после прыжка
      }
    }

    // Устанавливаем новую скорость: горизонтальная из вектора движения, вертикальная сохраняется или обновляется при прыжке
    rigidBody.setLinvel(
      {
        x: velocityVector.x,
        y: newY,
        z: velocityVector.z,
      },
      true
    )

    // Синхронизируем позицию камеры с физическим телом
    const translation = rigidBody.translation()
    const posX = translation.x
    let posY = translation.y
    const posZ = translation.z

    // Применяем View Bobbing
    if (isMoving) {
      const bobbingOffset = Math.sin(bobbingTime.current) * BOBBING_AMPLITUDE
      posY += bobbingOffset
    }

    // Применяем эффект приземления (приседание)
    if (isLanding.current) {
      const landingProgress = landingTime.current / LANDING_DURATION
      const landingOffset = Math.sin(landingProgress * Math.PI) * LANDING_AMPLITUDE
      posY -= landingOffset
    }

    // Небольшой вертикальный оффсет снижает риск микроконтактов с полом и визуального jitter
    posY += 0.01

    // Плавное следование камеры за физическим телом вместо жесткой привязки
    const targetPosition = targetPositionRef.current
    targetPosition.set(posX, posY, posZ)
    camera.position.lerp(targetPosition, POSITION_LERP_FACTOR)

    // Ограничиваем позицию границами (если заданы)
    if (bounds) {
      const clampedX = Math.max(
        bounds.minX + 1,
        Math.min(bounds.maxX - 1, posX)
      )
      const clampedZ = Math.max(
        bounds.minZ + 1,
        Math.min(bounds.maxZ - 1, posZ)
      )
      const clampedY = Math.max(
        bounds.minY,
        Math.min(bounds.maxY, posY)
      )
      
      if (Math.abs(posX - clampedX) > 0.01 || Math.abs(posZ - clampedZ) > 0.01 || Math.abs(posY - clampedY) > 0.01) {
        rigidBody.setTranslation({
          x: clampedX,
          y: clampedY,
          z: clampedZ,
        })
        targetPositionRef.current.set(clampedX, clampedY, clampedZ)
        camera.position.lerp(targetPositionRef.current, POSITION_LERP_FACTOR)
      }
    } else {
      // Фиксируем высоту на 1.6 (центр капсулы) только если нет гравитации
      if (!bounds) {
        const targetY = 1.6
        if (Math.abs(posY - targetY) > 0.01) {
          rigidBody.setTranslation({
            x: posX,
            y: targetY,
            z: posZ,
          })
          targetPositionRef.current.set(posX, targetY, posZ)
          camera.position.lerp(targetPositionRef.current, POSITION_LERP_FACTOR)
        }
      }
    }
  })

  // Условный RigidBody игрока: когда isLocked=true (Overlay открыт или идет возврат), RigidBody не существует
  // Нет тела — нет ошибок доступа к памяти Rust
  if (isLocked) {
    return null
  }

  // Проверка "нулевой" позиции: если initialPosition не пришел, вообще не рендерим RigidBody
  if (!initialPosition) {
    return null
  }

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="dynamic"
      enabledRotations={[false, false, false]}
      friction={0}
      linearDamping={0.5}
      gravityScale={bounds ? 1 : 0}
    >
      <CapsuleCollider args={[0.8, 0.4]} />
    </RigidBody>
  )
}

