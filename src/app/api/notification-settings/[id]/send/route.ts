import { NextRequest, NextResponse } from 'next/server'
import { sendClientNotification } from '@/lib/notification-service'

export const dynamic = 'force-dynamic'

// POST - Manually trigger notification send for a client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const result = await sendClientNotification(id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Notification sent successfully`,
      emailsSent: result.emailsSent,
      itemsCount: result.itemsCount,
      sentAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to send notification:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
