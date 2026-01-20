'use client'

import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FirstPersonControlsProps {
  onMobileMove?: (direction: 'forward' | 'backward' | 'left' | 'right', active: boolean) => void
  onMobileLook?: (deltaX: number, deltaY: number) => void
  bounds?: {
    minX: number
    maxX: number
    minZ: number
    maxZ: number
    minY: number
    maxY: number
  }
}

const PI_2 = Math.PI / 2

export default function FirstPersonControls({ onMobileMove, onMobileLook, bounds }: FirstPersonControlsProps = {}) {
  const { camera, gl } = useThree()
  const moveForward = useRef(false)
  const moveBackward = useRef(false)
  const moveLeft = useRef(false)
  const moveRight = useRef(false)
  
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const moveVector = useRef(new THREE.Vector3())

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

    ;(window as any).__mobileMoveHandler = handleMobileMove

    return () => {
      delete (window as any).__mobileMoveHandler
    }
  }, [onMobileMove])

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

    const onPointerLockChange = () => {
      const wasLocked = isPointerLocked
      isPointerLocked = document.pointerLockElement === gl.domElement
      
      if (wasLocked && !isPointerLocked) {
        gl.domElement.style.cursor = 'default'
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

        euler.current.setFromQuaternion(camera.quaternion)
        euler.current.y -= movementX * 0.002
        euler.current.x -= movementY * 0.002
        euler.current.x = Math.max(-PI_2, Math.min(PI_2, euler.current.x))
        camera.quaternion.setFromEuler(euler.current)
      } else if (isMouseDown) {
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

  useFrame((state, delta) => {
    const forward = Number(moveForward.current) - Number(moveBackward.current)
    const right = Number(moveRight.current) - Number(moveLeft.current)
    
    if (forward === 0 && right === 0) {
      return
    }

    const moveSpeed = 8.0
    const speed = moveSpeed * delta

    if (forward !== 0) {
      moveVector.current.setFromMatrixColumn(camera.matrix, 2)
      moveVector.current.multiplyScalar(-forward * speed)
      camera.position.add(moveVector.current)
    }

    if (right !== 0) {
      moveVector.current.setFromMatrixColumn(camera.matrix, 0)
      moveVector.current.multiplyScalar(right * speed)
      camera.position.add(moveVector.current)
    }

    if (bounds) {
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
    } else {
      if (camera.position.y !== 1.6) {
        camera.position.y = 1.6
      }
    }
  })

  return null
}

