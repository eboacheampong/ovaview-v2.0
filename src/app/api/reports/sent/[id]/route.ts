import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

export const dynamic = 'force-dynamic'

// GET — view a sent report's cached data
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const report = await db.sentReport.findUnique({ where: { id } })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (new Date() > new Date(report.expiresAt)) {
      return NextResponse.json({ error: 'Report has expired' }, { status: 410 })
    }

    return NextResponse.json({
      ...report,
      reportData: JSON.parse(report.reportData),
    })
  } catch (error) {
    console.error('[SentReports] View failed:', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
