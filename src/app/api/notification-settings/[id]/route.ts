import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET single notification setting
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const setting = await prisma.clientNotificationSetting.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
    })

    if (!setting) {
      return NextResponse.json({ error: 'Notification setting not found' }, { status: 404 })
    }

    return NextResponse.json(setting)
  } catch (error) {
    console.error('Failed to fetch notification setting:', error)
    return NextResponse.json({ error: 'Failed to fetch notification setting' }, { status: 500 })
  }
}

// PUT update notification setting
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { clientId, notificationTime, timezone, isActive, emailEnabled } = body

    // Check if setting exists
    const existing = await prisma.clientNotificationSetting.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Notification setting not found' }, { status: 404 })
    }

    // If changing client, check if new client exists and doesn't have a setting
    if (clientId && clientId !== existing.clientId) {
      const client = await prisma.client.findUnique({ where: { id: clientId } })
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }

      const existingForClient = await prisma.clientNotificationSetting.findUnique({
        where: { clientId },
      })
      if (existingForClient) {
        return NextResponse.json(
          { error: 'Notification setting already exists for this client' },
          { status: 409 }
        )
      }
    }

    const setting = await prisma.clientNotificationSetting.update({
      where: { id },
      data: {
        ...(clientId && { clientId }),
        ...(notificationTime && { notificationTime }),
        ...(timezone !== undefined && { timezone }),
        ...(isActive !== undefined && { isActive }),
        ...(emailEnabled !== undefined && { emailEnabled }),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
    })

    return NextResponse.json(setting)
  } catch (error) {
    console.error('Failed to update notification setting:', error)
    return NextResponse.json({ error: 'Failed to update notification setting' }, { status: 500 })
  }
}

// PATCH partial update (for toggling status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const setting = await prisma.clientNotificationSetting.update({
      where: { id },
      data: body,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
    })

    return NextResponse.json(setting)
  } catch (error) {
    console.error('Failed to update notification setting:', error)
    return NextResponse.json({ error: 'Failed to update notification setting' }, { status: 500 })
  }
}

// DELETE notification setting
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.clientNotificationSetting.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete notification setting:', error)
    return NextResponse.json({ error: 'Failed to delete notification setting' }, { status: 500 })
  }
}
