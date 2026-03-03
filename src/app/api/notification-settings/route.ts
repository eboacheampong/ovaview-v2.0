import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET all notification settings with client info
export async function GET() {
  try {
    const settings = await prisma.clientNotificationSetting.findMany({
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
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Failed to fetch notification settings:', error)
    return NextResponse.json({ error: 'Failed to fetch notification settings' }, { status: 500 })
  }
}

// POST create new notification setting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, notificationTime, timezone, isActive, emailEnabled, smsEnabled } = body

    if (!clientId || !notificationTime) {
      return NextResponse.json(
        { error: 'Client ID and notification time are required' },
        { status: 400 }
      )
    }

    // Check if client exists
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Check if setting already exists for this client
    const existing = await prisma.clientNotificationSetting.findUnique({
      where: { clientId },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Notification setting already exists for this client' },
        { status: 409 }
      )
    }

    const setting = await prisma.clientNotificationSetting.create({
      data: {
        clientId,
        notificationTime,
        timezone: timezone || 'Africa/Harare',
        isActive: isActive ?? true,
        emailEnabled: emailEnabled ?? true,
        smsEnabled: smsEnabled ?? false,
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

    return NextResponse.json(setting, { status: 201 })
  } catch (error) {
    console.error('Failed to create notification setting:', error)
    return NextResponse.json({ error: 'Failed to create notification setting' }, { status: 500 })
  }
}
