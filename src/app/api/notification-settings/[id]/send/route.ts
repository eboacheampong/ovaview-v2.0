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
    
    // Parse request body for mode option
    let mode: 'since_last' | 'last_24h' = 'since_last'
    try {
      const body = await request.json()
      if (body.mode === 'last_24h') {
        mode = 'last_24h'
      }
    } catch {
      // No body or invalid JSON - use default mode
    }
    
    console.log('[Notification] Manual send triggered for setting:', id, 'mode:', mode)

    const result = await sendClientNotification(id, mode)
    console.log('[Notification] Result:', JSON.stringify(result))

    // Always return the full result so UI can show accurate feedback
    return NextResponse.json({ 
      success: result.success,
      error: result.error || null,
      emailsSent: result.emailsSent,
      itemsCount: result.itemsCount,
      sentAt: result.success && result.emailsSent > 0 ? new Date().toISOString() : null,
    }, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('[Notification] Failed to send notification:', error)
    return NextResponse.json({ 
      success: false,
      error: String(error),
      emailsSent: 0,
      itemsCount: 0,
    }, { status: 500 })
  }
}
