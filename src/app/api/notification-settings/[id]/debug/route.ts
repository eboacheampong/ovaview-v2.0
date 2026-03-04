import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

// GET - Debug notification setting and check what would be sent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check if setting exists
    const setting = await db.clientNotificationSetting.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            users: {
              where: { isActive: true, role: 'CLIENT_USER' },
              select: { id: true, name: true, email: true },
            },
            industries: { select: { industryId: true } },
            keywords: { include: { keyword: true } },
          },
        },
      },
    })

    if (!setting) {
      return NextResponse.json({ 
        error: 'Setting not found',
        hint: 'The notification setting ID does not exist in the database. Make sure the migration has been applied.'
      }, { status: 404 })
    }

    // Check recipients
    const recipients: string[] = []
    if (setting.client.email) {
      recipients.push(setting.client.email)
    }
    for (const user of setting.client.users) {
      if (user.email && !recipients.includes(user.email)) {
        recipients.push(user.email)
      }
    }

    // Check env vars
    const envCheck = {
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM || 'not set (will use default)',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not set',
    }

    return NextResponse.json({
      setting: {
        id: setting.id,
        clientId: setting.clientId,
        clientName: setting.client.name,
        clientEmail: setting.client.email,
        notificationTime: setting.notificationTime,
        timezone: setting.timezone,
        isActive: setting.isActive,
        emailEnabled: setting.emailEnabled,
        lastSentAt: setting.lastSentAt,
      },
      recipients,
      recipientCount: recipients.length,
      industries: setting.client.industries.length,
      keywords: setting.client.keywords.map((k: { keyword: { name: string } }) => k.keyword.name),
      envCheck,
      warnings: [
        ...(recipients.length === 0 ? ['No recipients found - client has no email and no active users'] : []),
        ...(!setting.emailEnabled ? ['Email notifications are disabled for this setting'] : []),
        ...(!setting.isActive ? ['This notification setting is inactive'] : []),
        ...(!process.env.RESEND_API_KEY ? ['RESEND_API_KEY is not set'] : []),
      ],
    })
  } catch (error) {
    console.error('[Debug] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
