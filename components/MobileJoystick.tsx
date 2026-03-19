'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'

interface MobileJoystickProps {
  onVectorChange: (vector: { x: number; y: number; active: boolean }) => void
}

const JOYSTICK_SIZE = 150
const JOYSTICK_RADIUS = 50
const STICK_SIZE = 56

export default function MobileJoystick({ onVectorChange }: MobileJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const baseRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef<HTMLDivElement>(null)
  const activeTouchIdRef = useRef<number | null>(null)

  const center = useMemo(() => ({ x: JOYSTICK_SIZE / 2, y: JOYSTICK_SIZE / 2 }), [])

  const applyVisualState = useCallback((x: number, y: number, isActive: boolean) => {
    if (baseRef.current) {
      baseRef.current.style.background = isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)'
      baseRef.current.style.border = isActive ? '2px solid rgba(255,255,255,0.7)' : '2px solid rgba(255,255,255,0.45)'
    }
    if (stickRef.current) {
      stickRef.current.style.transform = `translate(-50%, -50%) translate(${x * JOYSTICK_RADIUS}px, ${-y * JOYSTICK_RADIUS}px)`
      stickRef.current.style.background = isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)'
      stickRef.current.style.boxShadow = isActive ? '0 0 18px rgba(255, 223, 140, 0.55)' : '0 2px 8px rgba(0,0,0,0.2)'
      stickRef.current.style.transition = isActive ? 'none' : 'transform 120ms ease-out, box-shadow 120ms ease-out'
    }
  }, [])

  const emitVector = useCallback((x: number, y: number, isActive: boolean) => {
    onVectorChange({ x, y, active: isActive })
    applyVisualState(x, y, isActive)
  }, [applyVisualState, onVectorChange])

  const computeVectorFromTouch = useCallback((point: { clientX: number; clientY: number }) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }

    const localX = point.clientX - rect.left
    const localY = point.clientY - rect.top
    const dx = localX - center.x
    const dy = localY - center.y
    const length = Math.sqrt(dx * dx + dy * dy)
    const clampedLength = Math.min(length, JOYSTICK_RADIUS)
    const nx = length > 0 ? dx / length : 0
    const ny = length > 0 ? dy / length : 0

    // y инвертируем: вверх = положительное значение движения вперед
    return {
      x: nx * (clampedLength / JOYSTICK_RADIUS),
      y: -ny * (clampedLength / JOYSTICK_RADIUS),
    }
  }, [center.x, center.y])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (activeTouchIdRef.current !== null) return

    const touch = e.changedTouches[0]
    if (!touch) return
    activeTouchIdRef.current = touch.identifier
    const next = computeVectorFromTouch({ clientX: touch.clientX, clientY: touch.clientY })
    emitVector(next.x, next.y, true)
  }, [computeVectorFromTouch, emitVector])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const activeId = activeTouchIdRef.current
    if (activeId === null) return

    const touch = Array.from(e.touches).find((t) => t.identifier === activeId)
    if (!touch) return
    e.preventDefault()
    e.stopPropagation()

    const next = computeVectorFromTouch({ clientX: touch.clientX, clientY: touch.clientY })
    emitVector(next.x, next.y, true)
  }, [computeVectorFromTouch, emitVector])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const activeId = activeTouchIdRef.current
    if (activeId === null) return
    const ended = Array.from(e.changedTouches).some((t) => t.identifier === activeId)
    if (!ended) return

    e.preventDefault()
    e.stopPropagation()
    activeTouchIdRef.current = null
    emitVector(0, 0, false)
  }, [emitVector])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: false })
    container.addEventListener('touchcancel', handleTouchEnd, { passive: false })

    // Страховка от пропущенного touchend: сбрасываем, если tracked touch больше не существует
    const handleGlobalTouchState = (e: TouchEvent) => {
      const activeTouchId = activeTouchIdRef.current
      if (activeTouchId === null) return
      const stillPresent = Array.from(e.touches).some((t) => t.identifier === activeTouchId)
      if (!stillPresent) {
        activeTouchIdRef.current = null
        emitVector(0, 0, false)
      }
    }

    window.addEventListener('touchstart', handleGlobalTouchState, { passive: true })
    window.addEventListener('touchend', handleGlobalTouchState, { passive: true })
    window.addEventListener('touchcancel', handleGlobalTouchState, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchEnd)
      window.removeEventListener('touchstart', handleGlobalTouchState)
      window.removeEventListener('touchend', handleGlobalTouchState)
      window.removeEventListener('touchcancel', handleGlobalTouchState)
    }
  }, [emitVector, handleTouchEnd, handleTouchMove, handleTouchStart])

  return (
    <div
      ref={containerRef}
      className="mobile-joystick-ui absolute bottom-4 left-4 z-[100]"
      style={{
        width: `${JOYSTICK_SIZE}px`,
        height: `${JOYSTICK_SIZE}px`,
        touchAction: 'none',
        pointerEvents: 'auto',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={baseRef}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          border: '2px solid rgba(255,255,255,0.45)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />
      <div
        ref={stickRef}
        style={{
          position: 'absolute',
          width: `${STICK_SIZE}px`,
          height: `${STICK_SIZE}px`,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%) translate(0px, 0px)',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.85)',
          border: '1px solid rgba(0,0,0,0.12)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          transition: 'transform 120ms ease-out, box-shadow 120ms ease-out',
        }}
      />
    </div>
  )
}
