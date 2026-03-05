import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()

    // Get all non-expired sent reports
    const reports = await db.sentReport.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { sentAt: 'desc' },
      select: {
        id: true,
        clientId: true,
        clientName: true,
        reportType: true,
        subject: true,
        recipients: true,
        dateRangeStart: true,
        dateRangeEnd: true,
        emailsSent: true,
        sentAt: true,
        expiresAt: true,
        // Don't include reportData in list — it's large
      },
      take: 100,
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('[SentReports] List failed:', error)
    return NextResponse.json({ error: 'Failed to fetch sent reports' }, { status: 500 })
  }
}
