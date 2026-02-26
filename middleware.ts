import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'admin_session'

/**
 * Проверка сессионной cookie в Edge (Web Crypto API).
 * Дублирует логику проверки подписи из lib/auth.ts для работы в middleware.
 */
async function verifySessionCookie(cookieValue: string | undefined, secret: string): Promise<boolean> {
  if (!cookieValue || !cookieValue.includes('.')) return false
  const [payloadB64, signatureB64] = cookieValue.split('.')
  if (!payloadB64 || !signatureB64) return false

  try {
    const b64Pad = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64Pad.length % 4
    const payloadBin = atob(pad ? b64Pad + '='.repeat(4 - pad) : b64Pad)
    const payloadBytes = new Uint8Array(payloadBin.length)
    for (let i = 0; i < payloadBin.length; i++) payloadBytes[i] = payloadBin.charCodeAt(i)

    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, payloadBytes)

    const sigBase64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/')
    const sigPad = sigBase64.length % 4
    const sigPadded = sigPad ? sigBase64 + '='.repeat(4 - sigPad) : sigBase64
    const expectedSig = Uint8Array.from(atob(sigPadded), (c) => c.charCodeAt(0))

    if (signature.byteLength !== expectedSig.length) return false
    const sigView = new Uint8Array(signature)
    let diff = 0
    for (let i = 0; i < sigView.length; i++) {
      diff |= sigView[i] ^ expectedSig[i]
    }
    if (diff !== 0) return false

    const payloadStr = new TextDecoder().decode(payloadBytes)
    const data = JSON.parse(payloadStr) as { role: string; exp: number }
    if (data.exp < Date.now()) return false
    if (data.role !== 'admin' && data.role !== 'super') return false
    return true
  } catch {
    return false
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Защищаем /admin/* (кроме самой страницы логина /admin и /admin/)
  const isAdminPage = pathname.startsWith('/admin')
  const isLoginPage = pathname === '/admin' || pathname === '/admin/'
  const isProtectedAdminPage = isAdminPage && !isLoginPage

  // Защищаем /api/admin/*
  const isProtectedApi = pathname.startsWith('/api/admin')

  if (!isProtectedAdminPage && !isProtectedApi) {
    return NextResponse.next()
  }

  const secret = process.env.JWT_SECRET_KEY
  if (!secret || secret.length < 16) {
    if (isProtectedApi) {
      return NextResponse.json({ error: 'Сервис авторизации недоступен' }, { status: 503 })
    }
    return NextResponse.next()
  }

  const cookieValue = request.cookies.get(COOKIE_NAME)?.value

  return verifySessionCookie(cookieValue, secret).then((valid) => {
    if (valid) {
      return NextResponse.next()
    }
    if (isProtectedApi) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
    }
    const loginUrl = new URL('/admin', request.url)
    return NextResponse.redirect(loginUrl)
  })
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
}
