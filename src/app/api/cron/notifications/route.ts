import { NextRequest, NextResponse } from 'next/server'
import { processScheduledNotifications } from '@/lib/notification-service'

export const dynamic = 'force-dynamic'

// This endpoint should be called by a cron job every minute or every 5 minutes
// You can use Vercel Cron, external cron service, or node-cron

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processScheduledNotifications()

    return NextResponse.json({
      success: true,
      processed: result.processed,
      sent: result.sent,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to process scheduled notifications:', error)
    return NextResponse.json({ error: 'Failed to process notifications' }, { status: 500 })
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}
