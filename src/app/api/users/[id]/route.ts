import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id },
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
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...user,
      role: user.role.toLowerCase(),
      username: user.name,
    })
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { firstName, lastName, email, role, isActive, clientId, password } = body

    const name = firstName && lastName 
      ? `${firstName} ${lastName}`.trim() 
      : body.name || body.username

    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (role) updateData.role = role.toUpperCase().replace('_', '_')
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (clientId !== undefined) updateData.clientId = clientId || null
    if (password && password.length >= 6) updateData.password = hashPassword(password)

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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
    })
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Handle role transformation
    if (body.role) {
      body.role = body.role.toUpperCase()
    }

    const user = await prisma.user.update({
      where: { id },
      data: body,
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
    })
  } catch (error) {
    console.error('Failed to patch user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
