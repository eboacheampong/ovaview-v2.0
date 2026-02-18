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
      where: { id, role: 'CLIENT_USER' },
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
      return NextResponse.json({ error: 'Client user not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...user,
      role: 'client_user',
      username: user.name,
    })
  } catch (error) {
    console.error('Failed to fetch client user:', error)
    return NextResponse.json({ error: 'Failed to fetch client user' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { username, email, isActive, clientId, password } = body

    const updateData: Record<string, unknown> = {}
    if (username) updateData.name = username
    if (email) updateData.email = email
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (clientId) updateData.clientId = clientId
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
      role: 'client_user',
      username: user.name,
    })
  } catch (error) {
    console.error('Failed to update client user:', error)
    return NextResponse.json({ error: 'Failed to update client user' }, { status: 500 })
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
    console.error('Failed to delete client user:', error)
    return NextResponse.json({ error: 'Failed to delete client user' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

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
      role: 'client_user',
      username: user.name,
    })
  } catch (error) {
    console.error('Failed to patch client user:', error)
    return NextResponse.json({ error: 'Failed to update client user' }, { status: 500 })
  }
}
