import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateWeeklyReport, generateMonthlyReport } from '@/lib/ai-report-service'
import { sendWeeklyReportEmail, sendMonthlyReportEmail } from '@/lib/report-emails'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

export async function POST(request: NextRequest) {
  try {
    const { clientId, reportType, startDate, endDate } = await request.json()

    if (!clientId || !reportType || !['weekly', 'monthly'].includes(reportType)) {
      return NextResponse.json({ error: 'clientId and valid reportType required' }, { status: 400 })
    }

    const client = await db.client.findUnique({
      where: { id: clientId },
      include: {
        users: {
          where: { isActive: true },
          select: { name: true, email: true },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const recipients: { email: string; name?: string }[] = []
    if (client.email) {
      recipients.push({ email: client.email, name: client.name })
    }
    for (const user of client.users) {
      if (user.email && !recipients.some((r: { email: string }) => r.email === user.email)) {
        recipients.push({ email: user.email, name: user.name })
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ success: false, error: 'No recipients found for this client', emailsSent: 0 })
    }

    // Build custom range if dates provided
    const customRange = startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined

    let emailsSent = 0
    const errors: string[] = []

    if (reportType === 'weekly') {
      const data = await generateWeeklyReport(clientId, undefined, customRange)
      for (const r of recipients) {
        try { await sendWeeklyReportEmail(data, r.email, r.name); emailsSent++ }
        catch (e) { errors.push(`${r.email}: ${e instanceof Error ? e.message : String(e)}`) }
      }
    } else {
      const data = await generateMonthlyReport(clientId, undefined, customRange)
      for (const r of recipients) {
        try { await sendMonthlyReportEmail(data, r.email, r.name); emailsSent++ }
        catch (e) { errors.push(`${r.email}: ${e instanceof Error ? e.message : String(e)}`) }
      }
    }

    return NextResponse.json({
      success: emailsSent > 0,
      emailsSent,
      error: errors.length > 0 ? errors.join('; ') : null,
    })
  } catch (error) {
    console.error('[Reports] Send to client failed:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed', emailsSent: 0 },
      { status: 500 }
    )
  }
}
