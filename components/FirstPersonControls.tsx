'use client'

import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FirstPersonControlsProps {
  onMobileMove?: (direction: 'forward' | 'backward' | 'left' | 'right', active: boolean) => void
  onMobileLook?: (deltaX: number, deltaY: number) => void
}

const PI_2 = Math.PI / 2 // Константа вне компонента

export default function FirstPersonControls({ onMobileMove, onMobileLook }: FirstPersonControlsProps = {}) {
  const { camera, gl } = useThree()
  const moveForward = useRef(false)
  const moveBackward = useRef(false)
  const moveLeft = useRef(false)
  const moveRight = useRef(false)
  
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const moveVector = useRef(new THREE.Vector3()) // Переиспользуем вектор для оптимизации

  // Обработка мобильных команд движения
  useEffect(() => {
    if (!onMobileMove) return

    const handleMobileMove = (direction: 'forward' | 'backward' | 'left' | 'right', active: boolean) => {
      switch (direction) {
        case 'forward':
          moveForward.current = active
          break
        case 'backward':
          moveBackward.current = active
          break
        case 'left':
          moveLeft.current = active
          break
        case 'right':
          moveRight.current = active
          break
      }
    }

    // Сохраняем обработчик для использования
    ;(window as any).__mobileMoveHandler = handleMobileMove

    return () => {
      delete (window as any).__mobileMoveHandler
    }
  }, [onMobileMove])

  // Обработка мобильных команд поворота
  useEffect(() => {
    if (!onMobileLook) return

    const handleMobileLook = (deltaX: number, deltaY: number) => {
      euler.current.setFromQuaternion(camera.quaternion)
      euler.current.y -= deltaX * 0.002
      euler.current.x -= deltaY * 0.002
      euler.current.x = Math.max(-PI_2, Math.min(PI_2, euler.current.x))
      camera.quaternion.setFromEuler(euler.current)
    }

    ;(window as any).__mobileLookHandler = handleMobileLook

    return () => {
      delete (window as any).__mobileLookHandler
    }
  }, [onMobileLook, camera])

  useEffect(() => {
    let isPointerLocked = false
    let lastMouseX = 0
    let lastMouseY = 0
    let isMouseDown = false

    // Управление клавиатурой
    const handleKeyDown = (event: KeyboardEvent) => {
      // Игнорируем если фокус на input/textarea
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
          // Прыжок отключен для упрощения
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
      }
    }

    // Управление мышью - два варианта: Pointer Lock или зажатая мышь
    const onPointerLockChange = () => {
      isPointerLocked = document.pointerLockElement === gl.domElement
    }

    const requestPointerLock = () => {
      gl.domElement.requestPointerLock().catch(() => {
        // Если Pointer Lock не поддерживается, используем альтернативный метод
        console.log('Pointer Lock не поддерживается, используем альтернативный метод')
      })
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 0) { // Левая кнопка мыши
        isMouseDown = true
        lastMouseX = event.clientX
        lastMouseY = event.clientY
        gl.domElement.style.cursor = 'none'
        requestPointerLock()
      }
    }

    const handleMouseUp = () => {
      isMouseDown = false
      gl.domElement.style.cursor = 'default'
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (isPointerLocked) {
        // Pointer Lock режим
        const movementX = event.movementX || 0
        const movementY = event.movementY || 0

        euler.current.setFromQuaternion(camera.quaternion)
        euler.current.y -= movementX * 0.002
        euler.current.x -= movementY * 0.002
        euler.current.x = Math.max(-PI_2, Math.min(PI_2, euler.current.x))
        camera.quaternion.setFromEuler(euler.current)
      } else if (isMouseDown) {
        // Альтернативный режим - при зажатой мыши
        const deltaX = event.clientX - lastMouseX
        const deltaY = event.clientY - lastMouseY

        euler.current.setFromQuaternion(camera.quaternion)
        euler.current.y -= deltaX * 0.002
        euler.current.x -= deltaY * 0.002
        euler.current.x = Math.max(-PI_2, Math.min(PI_2, euler.current.x))
        camera.quaternion.setFromEuler(euler.current)

        lastMouseX = event.clientX
        lastMouseY = event.clientY
      }
    }

    // События
    gl.domElement.addEventListener('mousedown', handleMouseDown)
    gl.domElement.addEventListener('mouseup', handleMouseUp)
    gl.domElement.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('pointerlockchange', onPointerLockChange)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // Выход из Pointer Lock при нажатии ESC
    const handleEsc = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && document.pointerLockElement) {
        document.exitPointerLock()
      }
    }
    document.addEventListener('keydown', handleEsc)

    return () => {
      gl.domElement.removeEventListener('mousedown', handleMouseDown)
      gl.domElement.removeEventListener('mouseup', handleMouseUp)
      gl.domElement.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      document.removeEventListener('keydown', handleEsc)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [camera, gl])

  useFrame((state, delta) => {
    // Оптимизация: проверяем, есть ли активное движение
    const forward = Number(moveForward.current) - Number(moveBackward.current)
    const right = Number(moveRight.current) - Number(moveLeft.current)
    
    // Если нет движения, пропускаем вычисления
    if (forward === 0 && right === 0) {
      return
    }

    // Скорость движения (оптимизированная)
    const moveSpeed = 8.0
    const speed = moveSpeed * delta

    // Движение относительно направления камеры (оптимизированное)
    // Движение вперед/назад (по оси Z камеры)
    if (forward !== 0) {
      moveVector.current.setFromMatrixColumn(camera.matrix, 2)
      moveVector.current.multiplyScalar(-forward * speed)
      camera.position.add(moveVector.current)
    }

    // Движение влево/вправо (по оси X камеры)
    if (right !== 0) {
      moveVector.current.setFromMatrixColumn(camera.matrix, 0)
      moveVector.current.multiplyScalar(right * speed)
      camera.position.add(moveVector.current)
    }

    // Фиксируем высоту на уровне глаз человека
    if (camera.position.y !== 1.6) {
      camera.position.y = 1.6
    }
  })

  return null
}

