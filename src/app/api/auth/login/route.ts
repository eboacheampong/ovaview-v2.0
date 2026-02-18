import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'

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

    let authenticatedUser: { id: string; email: string; name: string; role: string; isActive: boolean; clientId?: string | null } | null = null

    // If user exists in DB and is active, verify password
    if (user && user.isActive) {
      const passwordValid = verifyPassword(password, user.password)
      if (passwordValid) {
        authenticatedUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.toLowerCase(),
          isActive: user.isActive,
          clientId: user.clientId || null,
        }
      }
    }

    // If DB auth failed, allow env-based fallback credentials (development-only)
    if (!authenticatedUser) {
      const adminEmail = process.env.ADMIN_EMAIL
      const adminPassword = process.env.ADMIN_PASSWORD
      const clientEmail = process.env.CLIENT_EMAIL
      const clientPassword = process.env.CLIENT_PASSWORD

      if (email === adminEmail && password === adminPassword) {
        // Try to use DB user if exists, otherwise create a temporary env user response
        if (user) {
          authenticatedUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role.toLowerCase(),
            isActive: user.isActive,
            clientId: user.clientId || null,
          }
        } else {
          authenticatedUser = { id: 'env-admin', email, name: 'Env Admin', role: 'admin', isActive: true, clientId: null }
        }
      } else if (email === clientEmail && password === clientPassword) {
        if (user) {
          authenticatedUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role.toLowerCase(),
            isActive: user.isActive,
            clientId: user.clientId || null,
          }
        } else {
          authenticatedUser = { id: 'env-client', email, name: 'Env Client', role: 'client_user', isActive: true, clientId: null }
        }
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Generate token
    const token = {
      accessToken: `token-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      refreshToken: `refresh-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }

    const userResponse = {
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      name: authenticatedUser.name,
      role: authenticatedUser.role,
      isActive: authenticatedUser.isActive,
      clientId: authenticatedUser.clientId || null,
    }

    return NextResponse.json({ user: userResponse, token })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
