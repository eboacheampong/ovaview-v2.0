import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const db = prisma as any

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')

  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  }

  try {
    // Get recent sent reports for this client (last 30 days)
    const since = new Date()
    since.setDate(since.getDate() - 30)

    const reports = await db.sentReport.findMany({
      where: { clientId, sentAt: { gte: since } },
      orderBy: { sentAt: 'desc' },
      take: 20,
      select: {
        id: true,
        reportType: true,
        subject: true,
        sentAt: true,
        emailsSent: true,
      },
    })

    const notifications = reports.map((r: any) => ({
      id: r.id,
      type: r.reportType,
      title: r.subject,
      sentAt: r.sentAt,
      label: getTypeLabel(r.reportType),
    }))

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('[Client Notifications] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'daily': return 'Daily Update'
    case 'weekly': return 'Weekly Insights'
    case 'monthly': return 'Monthly Insights'
    case 'custom_ai': return 'AI Report'
    case 'custom_media': return 'Media Report'
    default: return 'Report'
  }
}
