import { NextRequest, NextResponse } from 'next/server'
import { generateWeeklyReport, generateMonthlyReport } from '@/lib/ai-report-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, reportType, startDate, endDate } = body

    if (!clientId || !reportType) {
      return NextResponse.json({ error: 'clientId and reportType required' }, { status: 400 })
    }

    const customRange = startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined

    if (reportType === 'weekly' || reportType === 'media') {
      const data = await generateWeeklyReport(clientId, undefined, customRange)
      return NextResponse.json(data)
    }

    if (reportType === 'monthly' || reportType === 'ai') {
      const data = await generateMonthlyReport(clientId, undefined, customRange)
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid reportType' }, { status: 400 })
  } catch (error) {
    console.error('[Reports] Generate failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    )
  }
}
