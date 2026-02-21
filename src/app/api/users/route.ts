import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const clientId = searchParams.get('clientId')

    const where: Record<string, unknown> = {}
    if (role) where.role = role.toUpperCase()
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

    // Transform role to lowercase for frontend compatibility
    const transformedUsers = users.map(user => ({
      ...user,
      role: user.role.toLowerCase().replace('_', '_'),
      username: user.name,
    }))

    return NextResponse.json(transformedUsers)
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, role, clientId, password } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const name = `${firstName || ''} ${lastName || ''}`.trim()
    const roleUpper = (role || 'USER').toUpperCase().replace('_', '_')

    // Hash the password
    const hashedPassword = password ? hashPassword(password) : hashPassword('temp-' + Date.now())

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: roleUpper as 'ADMIN' | 'USER' | 'DATA_ENTRY' | 'CLIENT_USER',
        clientId: clientId || null,
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
      role: user.role.toLowerCase(),
      username: user.name,
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
