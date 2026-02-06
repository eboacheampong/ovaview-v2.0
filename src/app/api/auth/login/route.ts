import { NextRequest, NextResponse } from 'next/server'

interface MockUser {
  id: string
  username: string
  email: string
  role: 'admin' | 'data_entry' | 'client_user'
  isActive: boolean
  clientId?: string
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Check against env credentials
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD
    const clientEmail = process.env.CLIENT_EMAIL
    const clientPassword = process.env.CLIENT_PASSWORD

    let user: MockUser | null = null

    if (email === adminEmail && password === adminPassword) {
      user = {
        id: '1',
        username: 'Admin User',
        email,
        role: 'admin',
        isActive: true,
      }
    } else if (email === clientEmail && password === clientPassword) {
      user = {
        id: '2',
        username: 'Client User',
        email,
        role: 'client_user',
        isActive: true,
        clientId: 'client-1',
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Generate mock token
    const token = {
      accessToken: `token-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      refreshToken: `refresh-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }

    return NextResponse.json({ user, token })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
