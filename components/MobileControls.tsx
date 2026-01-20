'use client'

import { useState, useRef, useEffect } from 'react'

interface MobileControlsProps {
  onMove: (direction: 'forward' | 'backward' | 'left' | 'right', active: boolean) => void
  onLook: (deltaX: number, deltaY: number) => void
}

export default function MobileControls({ onMove, onLook }: MobileControlsProps) {
  const [isTouchActive, setIsTouchActive] = useState(false)
  const [gyroEnabled, setGyroEnabled] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const lookTouchRef = useRef<{ x: number; y: number; touchId: number } | null>(null)
  const lastGyroRef = useRef<{ beta: number; gamma: number } | null>(null)
  const activeTouchIdRef = useRef<number | null>(null)
  const accumulatedDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const animationFrameRef = useRef<number | null>(null)
  const touchStartTimeRef = useRef<number | null>(null)
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)

  const isMobile = typeof window !== 'undefined' && 
    ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  useEffect(() => {
    if (!gyroEnabled || !isMobile) return

    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta !== null && event.gamma !== null) {
        if (lastGyroRef.current) {
          const deltaBeta = (event.beta - lastGyroRef.current.beta) * 2
          const deltaGamma = (event.gamma - lastGyroRef.current.gamma) * 2
          onLook(deltaGamma, deltaBeta)
        }
        lastGyroRef.current = { beta: event.beta, gamma: event.gamma }
      }
    }

    if (typeof DeviceOrientationEvent !== 'undefined') {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        ;(DeviceOrientationEvent as any).requestPermission()
          .then((response: string) => {
            if (response === 'granted') {
              window.addEventListener('deviceorientation', handleDeviceOrientation)
            }
          })
          .catch(() => {})
      } else {
        window.addEventListener('deviceorientation', handleDeviceOrientation)
      }
    }

    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation)
    }
  }, [gyroEnabled, isMobile, onLook])

  if (!isMobile) {
    return null
  }

  const handleTouchStart = (e: React.TouchEvent, direction: 'forward' | 'backward' | 'left' | 'right') => {
    e.preventDefault()
    setIsTouchActive(true)
    onMove(direction, true)
  }

  const handleTouchEnd = (e: React.TouchEvent, direction: 'forward' | 'backward' | 'left' | 'right') => {
    e.preventDefault()
    setIsTouchActive(false)
    onMove(direction, false)
  }

  const applyLookDelta = () => {
    if (accumulatedDeltaRef.current.x !== 0 || accumulatedDeltaRef.current.y !== 0) {
      const sensitivity = 1.8
      onLook(
        accumulatedDeltaRef.current.x * sensitivity,
        accumulatedDeltaRef.current.y * sensitivity
      )
      accumulatedDeltaRef.current = { x: 0, y: 0 }
    }
    
    if (lookTouchRef.current !== null && activeTouchIdRef.current !== null) {
      animationFrameRef.current = requestAnimationFrame(applyLookDelta)
    } else {
      animationFrameRef.current = null
    }
  }

  const handleLookTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return
    
    const touch = e.touches[0]
    
    if (activeTouchIdRef.current !== null) return
    
    const buttonAreaLeft = 16
    const buttonAreaBottom = 16
    const buttonAreaSize = 180
    const screenHeight = window.innerHeight
    const buttonAreaTop = screenHeight - buttonAreaBottom - buttonAreaSize
    
    const isInButtonArea = 
      touch.clientX >= buttonAreaLeft && 
      touch.clientX <= buttonAreaLeft + buttonAreaSize &&
      touch.clientY >= buttonAreaTop && 
      touch.clientY <= screenHeight - buttonAreaBottom
    
    if (isInButtonArea) return
    
    activeTouchIdRef.current = touch.identifier
    lookTouchRef.current = { 
      x: touch.clientX, 
      y: touch.clientY,
      touchId: touch.identifier
    }
    touchStartTimeRef.current = Date.now()
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
    accumulatedDeltaRef.current = { x: 0, y: 0 }
    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(applyLookDelta)
    }
  }

  const handleLookTouchMove = (e: React.TouchEvent) => {
    if (activeTouchIdRef.current === null || lookTouchRef.current === null) {
      return
    }
    
    let touch = Array.from(e.touches).find(
      t => t.identifier === activeTouchIdRef.current
    )
    
    if (!touch && e.touches.length > 0) {
      const buttonAreaLeft = 16
      const buttonAreaBottom = 16
      const buttonAreaSize = 180
      const screenHeight = window.innerHeight
      const buttonAreaTop = screenHeight - buttonAreaBottom - buttonAreaSize
      
      touch = Array.from(e.touches).find(t => {
        const isInButtonArea = 
          t.clientX >= buttonAreaLeft && 
          t.clientX <= buttonAreaLeft + buttonAreaSize &&
          t.clientY >= buttonAreaTop && 
          t.clientY <= screenHeight - buttonAreaBottom
        return !isInButtonArea
      })
      
      if (touch) {
        activeTouchIdRef.current = touch.identifier
        lookTouchRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          touchId: touch.identifier
        }
        touchStartTimeRef.current = Date.now()
        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
        accumulatedDeltaRef.current = { x: 0, y: 0 }
      } else {
        return
      }
    }
    
    if (touch && lookTouchRef.current && touchStartPosRef.current) {
      const moveDistance = Math.sqrt(
        Math.pow(touch.clientX - touchStartPosRef.current.x, 2) +
        Math.pow(touch.clientY - touchStartPosRef.current.y, 2)
      )
      
      if (moveDistance > 5) {
        const deltaX = touch.clientX - lookTouchRef.current.x
        const deltaY = touch.clientY - lookTouchRef.current.y
        
        accumulatedDeltaRef.current.x += deltaX
        accumulatedDeltaRef.current.y += deltaY
        
        lookTouchRef.current = { 
          x: touch.clientX, 
          y: touch.clientY,
          touchId: touch.identifier
        }
        
        if (animationFrameRef.current === null) {
          animationFrameRef.current = requestAnimationFrame(applyLookDelta)
        }
      }
    }
  }

  const handleLookTouchEnd = (e: React.TouchEvent) => {
    if (activeTouchIdRef.current !== null) {
      const endedTouch = Array.from(e.changedTouches).find(
        t => t.identifier === activeTouchIdRef.current
      )
      if (endedTouch && touchStartTimeRef.current && touchStartPosRef.current) {
        const touchDuration = Date.now() - touchStartTimeRef.current
        const moveDistance = Math.sqrt(
          Math.pow(endedTouch.clientX - touchStartPosRef.current.x, 2) +
          Math.pow(endedTouch.clientY - touchStartPosRef.current.y, 2)
        )
        
        if (moveDistance > 5 || touchDuration > 100) {
          if (accumulatedDeltaRef.current.x !== 0 || accumulatedDeltaRef.current.y !== 0) {
            const sensitivity = 1.8
            onLook(
              accumulatedDeltaRef.current.x * sensitivity,
              accumulatedDeltaRef.current.y * sensitivity
            )
          }
        }
        lookTouchRef.current = null
        activeTouchIdRef.current = null
        touchStartTimeRef.current = null
        touchStartPosRef.current = null
        accumulatedDeltaRef.current = { x: 0, y: 0 }
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
      }
    }
  }

  const handleLookTouchCancel = (e: React.TouchEvent) => {
    if (activeTouchIdRef.current !== null) {
      const cancelledTouch = Array.from(e.changedTouches).find(
        t => t.identifier === activeTouchIdRef.current
      )
      if (cancelledTouch) {
        lookTouchRef.current = null
        activeTouchIdRef.current = null
        touchStartTimeRef.current = null
        touchStartPosRef.current = null
        accumulatedDeltaRef.current = { x: 0, y: 0 }
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
      }
    }
  }

  useEffect(() => {
    if (!isMobile) return

    const canvas = document.querySelector('canvas')
    if (!canvas) return

    const handleCanvasTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return
      
      const touch = e.touches[0]
      
      const buttonAreaLeft = 16
      const buttonAreaBottom = 16
      const buttonAreaSize = 180
      const screenHeight = window.innerHeight
      const buttonAreaTop = screenHeight - buttonAreaBottom - buttonAreaSize
      
      const isInButtonArea = 
        touch.clientX >= buttonAreaLeft && 
        touch.clientX <= buttonAreaLeft + buttonAreaSize &&
        touch.clientY >= buttonAreaTop && 
        touch.clientY <= screenHeight - buttonAreaBottom
      
      if (!isInButtonArea && activeTouchIdRef.current === null) {
        const syntheticEvent = {
          touches: e.touches,
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as React.TouchEvent
        
        handleLookTouchStart(syntheticEvent)
      }
    }

    const handleCanvasTouchMove = (e: TouchEvent) => {
      if (activeTouchIdRef.current !== null) {
        const syntheticEvent = {
          touches: e.touches,
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as React.TouchEvent
        
        handleLookTouchMove(syntheticEvent)
      }
    }

    const handleCanvasTouchEnd = (e: TouchEvent) => {
      if (activeTouchIdRef.current !== null) {
        const syntheticEvent = {
          changedTouches: e.changedTouches,
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as React.TouchEvent
        
        handleLookTouchEnd(syntheticEvent)
      }
    }

    const handleCanvasTouchCancel = (e: TouchEvent) => {
      if (activeTouchIdRef.current !== null) {
        const syntheticEvent = {
          changedTouches: e.changedTouches,
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as React.TouchEvent
        
        handleLookTouchCancel(syntheticEvent)
      }
    }

    canvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: true })
    canvas.addEventListener('touchmove', handleCanvasTouchMove, { passive: true })
    canvas.addEventListener('touchend', handleCanvasTouchEnd, { passive: true })
    canvas.addEventListener('touchcancel', handleCanvasTouchCancel, { passive: true })

    return () => {
      canvas.removeEventListener('touchstart', handleCanvasTouchStart)
      canvas.removeEventListener('touchmove', handleCanvasTouchMove)
      canvas.removeEventListener('touchend', handleCanvasTouchEnd)
      canvas.removeEventListener('touchcancel', handleCanvasTouchCancel)
    }
  }, [isMobile])

  return (
    <>

      <div className="absolute bottom-4 left-4 z-20">
        <div className="grid grid-cols-3 gap-1.5">
          <div></div>
          <button
            onTouchStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTouchStart(e, 'forward')
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTouchEnd(e, 'forward')
            }}
            onTouchCancel={(e) => {
              e.preventDefault()
              handleTouchEnd(e, 'forward')
            }}
            onMouseDown={() => onMove('forward', true)}
            onMouseUp={() => onMove('forward', false)}
            onMouseLeave={() => onMove('forward', false)}
            className="w-12 h-12 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center text-gray-800 font-bold text-lg active:bg-primary-100 active:scale-95 transition-all touch-none select-none border border-gray-300"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            ↑
          </button>
          <div></div>
          
          <button
            onTouchStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTouchStart(e, 'left')
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTouchEnd(e, 'left')
            }}
            onTouchCancel={(e) => {
              e.preventDefault()
              handleTouchEnd(e, 'left')
            }}
            onMouseDown={() => onMove('left', true)}
            onMouseUp={() => onMove('left', false)}
            onMouseLeave={() => onMove('left', false)}
            className="w-12 h-12 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center text-gray-800 font-bold text-lg active:bg-primary-100 active:scale-95 transition-all touch-none select-none border border-gray-300"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            ←
          </button>
          <div className="w-12 h-12"></div>
          <button
            onTouchStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTouchStart(e, 'right')
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTouchEnd(e, 'right')
            }}
            onTouchCancel={(e) => {
              e.preventDefault()
              handleTouchEnd(e, 'right')
            }}
            onMouseDown={() => onMove('right', true)}
            onMouseUp={() => onMove('right', false)}
            onMouseLeave={() => onMove('right', false)}
            className="w-12 h-12 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center text-gray-800 font-bold text-lg active:bg-primary-100 active:scale-95 transition-all touch-none select-none border border-gray-300"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            →
          </button>
          
          <div></div>
          <button
            onTouchStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTouchStart(e, 'backward')
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTouchEnd(e, 'backward')
            }}
            onTouchCancel={(e) => {
              e.preventDefault()
              handleTouchEnd(e, 'backward')
            }}
            onMouseDown={() => onMove('backward', true)}
            onMouseUp={() => onMove('backward', false)}
            onMouseLeave={() => onMove('backward', false)}
            className="w-12 h-12 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center text-gray-800 font-bold text-lg active:bg-primary-100 active:scale-95 transition-all touch-none select-none border border-gray-300"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            ↓
          </button>
          {/* Пустая ячейка */}
          <div></div>
        </div>
      </div>

    </>
  )
}

