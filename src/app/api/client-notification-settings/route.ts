import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Get notification settings for a client (by clientId query param)
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId')
  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  }

  try {
    const setting = await prisma.clientNotificationSetting.findUnique({
      where: { clientId },
    })

    if (!setting) {
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({
      exists: true,
      id: setting.id,
      notificationTime: setting.notificationTime,
      timezone: setting.timezone,
      isActive: setting.isActive,
      emailEnabled: setting.emailEnabled,
      weeklyDay: setting.weeklyDay,
      weeklyTime: setting.weeklyTime,
      monthlyDay: setting.monthlyDay,
      monthlyTime: setting.monthlyTime,
      weeklyEnabled: setting.weeklyEnabled,
      monthlyEnabled: setting.monthlyEnabled,
    })
  } catch (error) {
    console.error('Failed to fetch client notification settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PUT - Update notification settings for a client
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, notificationTime, timezone, weeklyDay, weeklyTime, monthlyDay, monthlyTime, weeklyEnabled, monthlyEnabled } = body

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    const setting = await prisma.clientNotificationSetting.findUnique({
      where: { clientId },
    })

    if (!setting) {
      return NextResponse.json({ error: 'No notification settings found. Please contact your administrator.' }, { status: 404 })
    }

    const updated = await prisma.clientNotificationSetting.update({
      where: { id: setting.id },
      data: {
        ...(notificationTime !== undefined && { notificationTime }),
        ...(timezone !== undefined && { timezone }),
        ...(weeklyDay !== undefined && { weeklyDay }),
        ...(weeklyTime !== undefined && { weeklyTime }),
        ...(monthlyDay !== undefined && { monthlyDay }),
        ...(monthlyTime !== undefined && { monthlyTime }),
        ...(weeklyEnabled !== undefined && { weeklyEnabled }),
        ...(monthlyEnabled !== undefined && { monthlyEnabled }),
      },
    })

    return NextResponse.json({
      id: updated.id,
      notificationTime: updated.notificationTime,
      timezone: updated.timezone,
      isActive: updated.isActive,
      emailEnabled: updated.emailEnabled,
      weeklyDay: updated.weeklyDay,
      weeklyTime: updated.weeklyTime,
      monthlyDay: updated.monthlyDay,
      monthlyTime: updated.monthlyTime,
      weeklyEnabled: updated.weeklyEnabled,
      monthlyEnabled: updated.monthlyEnabled,
    })
  } catch (error) {
    console.error('Failed to update client notification settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
