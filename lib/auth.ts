import { NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

const COOKIE_NAME = 'admin_session'
const COOKIE_MAX_AGE = 86400 // 24 часа
const ROLE_ADMIN = 'admin'
const ROLE_SUPER = 'super'
const WRONG_KEY_DELAY_MS = 500
export type AdminRole = typeof ROLE_ADMIN | typeof ROLE_SUPER

/** Секрет для подписи и проверки сессионных cookie (HMAC-SHA256). */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET_KEY
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET_KEY must be set in .env and at least 16 characters')
  }
  return secret
}

/** API-ключ для заголовка x-admin-auth (внешние скрипты/сервисы). Если не задан — проверка по заголовку отключена. */
function getApiServiceKey(): string | null {
  const key = process.env.API_SERVICE_KEY
  return key && key.length >= 16 ? key : null
}

function base64UrlEncode(data: Buffer | string): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str: string): Buffer {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4
  if (pad) b64 += '='.repeat(4 - pad)
  return Buffer.from(b64, 'base64')
}

function signPayload(payload: string): string {
  const secret = getJwtSecret()
  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  return base64UrlEncode(hmac.digest())
}

function verifyPayload(payload: string, signature: string): boolean {
  try {
    const expected = signPayload(payload)
    if (expected.length !== signature.length) return false
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'))
  } catch {
    return false
  }
}

export interface AdminSession {
  role: AdminRole
}

/**
 * Проверяет значение cookie admin_session через JWT_SECRET_KEY (HMAC-SHA256).
 * Используется в API (из request) и в Server Components (из cookies().get()).
 */
export function getAdminFromCookieValue(cookieValue: string | undefined): AdminSession | null {
  if (!cookieValue || !cookieValue.includes('.')) return null
  const [payloadB64, signature] = cookieValue.split('.')
  if (!payloadB64 || !signature) return null
  try {
    const payloadJson = base64UrlDecode(payloadB64).toString('utf8')
    if (!verifyPayload(payloadJson, signature)) return null
    const data = JSON.parse(payloadJson) as { role: string; exp: number }
    if (data.exp < Date.now()) return null
    if (data.role !== ROLE_ADMIN && data.role !== ROLE_SUPER) return null
    return { role: data.role as AdminRole }
  } catch {
    return null
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Определяет админа по запросу:
 * - Если есть cookie admin_session — проверяем подпись через JWT_SECRET_KEY.
 * - Если есть заголовок x-admin-auth — сравниваем с API_SERVICE_KEY; при неверном ключе задержка 500 мс (защита от перебора).
 */
export async function getAdminFromRequest(request: NextRequest): Promise<AdminSession | null> {
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value
  const fromCookie = getAdminFromCookieValue(cookieValue)
  if (fromCookie) return fromCookie

  const headerKey = request.headers.get('x-admin-auth')
  if (headerKey) {
    const apiKey = getApiServiceKey()
    if (apiKey) {
      if (headerKey.length === apiKey.length && timingSafeEqual(Buffer.from(headerKey, 'utf8'), Buffer.from(apiKey, 'utf8'))) {
        return { role: ROLE_SUPER }
      }
      await delay(WRONG_KEY_DELAY_MS)
    }
  }
  return null
}

/**
 * Создаёт значение cookie для сессии (payload.signature), подпись через JWT_SECRET_KEY.
 */
export function createSessionCookie(role: AdminRole): string {
  const payload = JSON.stringify({
    role,
    exp: Date.now() + COOKIE_MAX_AGE * 1000,
  })
  const payloadB64 = base64UrlEncode(payload)
  const signature = signPayload(payload)
  const value = `${payloadB64}.${signature}`
  const isProd = process.env.NODE_ENV === 'production'
  const secure = isProd ? '; Secure' : ''
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${secure}`
}

/**
 * Очищает cookie сессии.
 */
export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

/**
 * Проверяет пароль для логина (admin или super). Пароли задаются в .env.
 */
export function checkPassword(username: string, password: string): AdminRole | null {
  const adminPass = process.env.ADMIN_PASSWORD
  const superPass = process.env.SUPER_PASSWORD
  if (username === 'admin' && adminPass && password === adminPass) return ROLE_ADMIN
  if (username === 'super' && superPass && password === superPass) return ROLE_SUPER
  return null
}
