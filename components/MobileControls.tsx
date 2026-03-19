'use client'

import { useRef, useEffect, useCallback, type MutableRefObject } from 'react'

interface MobileControlsProps {
  onLook: (deltaX: number, deltaY: number) => void
  canvasElement?: HTMLCanvasElement | null
  lookActiveRef?: MutableRefObject<boolean>
  lookTouchIdExternalRef?: MutableRefObject<number | null>
  lookGestureTimeRef?: MutableRefObject<number>
  tapSuppressionUntilRef?: MutableRefObject<number>
}

const LOOK_SENSITIVITY = 4.4

export default function MobileControls({
  onLook,
  canvasElement,
  lookActiveRef,
  lookTouchIdExternalRef,
  lookGestureTimeRef,
  tapSuppressionUntilRef,
}: MobileControlsProps) {
  const lookTouchIdRef = useRef<number | null>(null)
  const lookStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const lookLastPosRef = useRef<{ x: number; y: number } | null>(null)
  const lookMovedRef = useRef(false)
  const LOOK_ACTIVATION_PX = 10

  const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  const shouldIgnoreTouchForLook = useCallback((touch: Touch) => {
    const target = touch.target as Element | null
    return !!target?.closest('.mobile-joystick-ui')
  }, [])

  const resetLookState = useCallback((applySuppression: boolean) => {
    lookTouchIdRef.current = null
    lookStartPosRef.current = null
    lookLastPosRef.current = null
    lookMovedRef.current = false
    if (lookTouchIdExternalRef) {
      lookTouchIdExternalRef.current = null
    }
    if (lookActiveRef) {
      lookActiveRef.current = false
    }
    if (applySuppression && tapSuppressionUntilRef) {
      tapSuppressionUntilRef.current = performance.now() + 220
    }
  }, [lookActiveRef, lookTouchIdExternalRef, tapSuppressionUntilRef])

  useEffect(() => {
    if (!isMobile) return
    const canvas = canvasElement
    if (!canvas) return

    const handleCanvasTouchStart = (e: TouchEvent) => {
      const eventTarget = e.target as Element | null
      if (eventTarget?.closest('.mobile-joystick-ui')) return
      if (lookTouchIdRef.current !== null) return

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        if (shouldIgnoreTouchForLook(touch)) continue
        lookTouchIdRef.current = touch.identifier
        lookStartPosRef.current = { x: touch.clientX, y: touch.clientY }
        lookLastPosRef.current = { x: touch.clientX, y: touch.clientY }
        lookMovedRef.current = false
        break
      }
    }

    const handleCanvasTouchMove = (e: TouchEvent) => {
      const lookTouchId = lookTouchIdRef.current
      const lookStartPos = lookStartPosRef.current
      const lookLastPos = lookLastPosRef.current
      if (lookTouchId === null || !lookStartPos || !lookLastPos) return

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        if (touch.identifier !== lookTouchId) continue
        if (shouldIgnoreTouchForLook(touch)) continue

        if (!lookMovedRef.current) {
          const totalDx = touch.clientX - lookStartPos.x
          const totalDy = touch.clientY - lookStartPos.y
          if (totalDx * totalDx + totalDy * totalDy < LOOK_ACTIVATION_PX * LOOK_ACTIVATION_PX) {
            return
          }
          lookMovedRef.current = true
          if (lookTouchIdExternalRef) {
            lookTouchIdExternalRef.current = lookTouchId
          }
          if (lookActiveRef) {
            lookActiveRef.current = true
          }
          if (lookGestureTimeRef) {
            lookGestureTimeRef.current = performance.now()
          }
          if (tapSuppressionUntilRef) {
            tapSuppressionUntilRef.current = performance.now() + 260
          }
          lookLastPosRef.current = { x: touch.clientX, y: touch.clientY }
          e.preventDefault()
          return
        }

        e.preventDefault()
        const deltaX = touch.clientX - lookLastPos.x
        const deltaY = touch.clientY - lookLastPos.y
        if (deltaX !== 0 || deltaY !== 0) {
          onLook(deltaX * LOOK_SENSITIVITY, deltaY * LOOK_SENSITIVITY)
          if (lookGestureTimeRef) {
            lookGestureTimeRef.current = performance.now()
          }
          if (tapSuppressionUntilRef) {
            tapSuppressionUntilRef.current = performance.now() + 260
          }
        }
        lookLastPosRef.current = { x: touch.clientX, y: touch.clientY }
        break
      }
    }

    const handleCanvasTouchEnd = (e: TouchEvent) => {
      const lookTouchId = lookTouchIdRef.current
      if (lookTouchId === null) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookTouchId) {
          resetLookState(lookMovedRef.current)
          break
        }
      }
    }

    const handleCanvasTouchCancel = (e: TouchEvent) => {
      const lookTouchId = lookTouchIdRef.current
      if (lookTouchId === null) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookTouchId) {
          resetLookState(lookMovedRef.current)
          break
        }
      }
    }

    // Страховка от редких "потерянных" touchend: сбрасываем, если tracked touch больше не существует
    const handleGlobalTouchState = (e: TouchEvent) => {
      const lookTouchId = lookTouchIdRef.current
      if (lookTouchId === null) return
      const stillPresent = Array.from(e.touches).some((t) => t.identifier === lookTouchId)
      if (!stillPresent) {
        resetLookState(lookMovedRef.current)
      }
    }

    // Capture phase: look-touch должен захватываться раньше tap-raycast логики
    canvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: false, capture: true })
    canvas.addEventListener('touchmove', handleCanvasTouchMove, { passive: false, capture: true })
    canvas.addEventListener('touchend', handleCanvasTouchEnd, { passive: false, capture: true })
    canvas.addEventListener('touchcancel', handleCanvasTouchCancel, { passive: false, capture: true })
    window.addEventListener('touchstart', handleGlobalTouchState, { passive: true })
    window.addEventListener('touchend', handleGlobalTouchState, { passive: true })
    window.addEventListener('touchcancel', handleGlobalTouchState, { passive: true })

    return () => {
      canvas.removeEventListener('touchstart', handleCanvasTouchStart, true)
      canvas.removeEventListener('touchmove', handleCanvasTouchMove, true)
      canvas.removeEventListener('touchend', handleCanvasTouchEnd, true)
      canvas.removeEventListener('touchcancel', handleCanvasTouchCancel, true)
      window.removeEventListener('touchstart', handleGlobalTouchState)
      window.removeEventListener('touchend', handleGlobalTouchState)
      window.removeEventListener('touchcancel', handleGlobalTouchState)
      resetLookState(false)
    }
  }, [LOOK_ACTIVATION_PX, canvasElement, isMobile, lookActiveRef, lookGestureTimeRef, lookTouchIdExternalRef, onLook, resetLookState, shouldIgnoreTouchForLook, tapSuppressionUntilRef])

  return null
}
