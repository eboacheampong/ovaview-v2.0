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
    console.log('[Notification] Manual send triggered for setting:', id)

    const result = await sendClientNotification(id)
    console.log('[Notification] Result:', result)

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
    console.error('[Notification] Failed to send notification:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
