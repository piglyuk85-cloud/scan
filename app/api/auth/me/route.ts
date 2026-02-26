import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request)
  if (!admin) {
    return NextResponse.json({ role: null }, { status: 200 })
  }
  return NextResponse.json({ role: admin.role })
}
