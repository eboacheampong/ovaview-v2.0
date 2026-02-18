import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    const where: Record<string, unknown> = { role: 'CLIENT_USER' }
    if (clientId) where.clientId = clientId

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        clientId: true,
        client: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const transformedUsers = users.map(user => ({
      ...user,
      role: 'client_user',
      username: user.name,
    }))

    return NextResponse.json(transformedUsers)
  } catch (error) {
    console.error('Failed to fetch client users:', error)
    return NextResponse.json({ error: 'Failed to fetch client users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, clientId, password } = body

    if (!email || !clientId) {
      return NextResponse.json({ error: 'Email and clientId are required' }, { status: 400 })
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const user = await prisma.user.create({
      data: {
        name: username || email.split('@')[0],
        email,
        password: password || 'temp-password-' + Date.now(),
        role: 'CLIENT_USER',
        clientId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        clientId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      ...user,
      role: 'client_user',
      username: user.name,
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create client user:', error)
    return NextResponse.json({ error: 'Failed to create client user' }, { status: 500 })
  }
}
