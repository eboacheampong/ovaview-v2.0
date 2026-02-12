import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email },
      include: { client: { select: { id: true, name: true } } }
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // For now, do simple string comparison - in production use bcrypt
    // TODO: Update password storage to use bcrypt hashing
    if (password !== user.password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Generate token
    const token = {
      accessToken: `token-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      refreshToken: `refresh-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }

    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      clientId: user.clientId,
    }

    return NextResponse.json({ user: userResponse, token })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
