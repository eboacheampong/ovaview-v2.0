import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Manually trigger notification send for a client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get the notification setting with client info
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

    if (!setting.client.email) {
      return NextResponse.json({ error: 'Client has no email address' }, { status: 400 })
    }

    // TODO: Implement actual notification sending logic here
    // This is where you would:
    // 1. Gather the news/content to send
    // 2. Format the email
    // 3. Send via email service (e.g., SendGrid, AWS SES, etc.)
    
    // For now, just update the lastSentAt timestamp
    await prisma.clientNotificationSetting.update({
      where: { id },
      data: { lastSentAt: new Date() },
    })

    return NextResponse.json({ 
      success: true, 
      message: `Notification sent to ${setting.client.name}`,
      sentAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to send notification:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
