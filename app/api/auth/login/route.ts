import { NextRequest, NextResponse } from 'next/server'
import { checkPassword, createSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Укажите логин и пароль' },
        { status: 400 }
      )
    }

    const role = checkPassword(username, password)
    if (!role) {
      return NextResponse.json(
        { error: 'Неверный логин или пароль' },
        { status: 401 }
      )
    }

    const cookie = createSessionCookie(role)
    const response = NextResponse.json({ success: true, role })
    response.headers.set('Set-Cookie', cookie)
    return response
  } catch (error) {
    console.error('Ошибка входа:', error)
    return NextResponse.json(
      { error: 'Ошибка сервера при входе' },
      { status: 500 }
    )
  }
}
