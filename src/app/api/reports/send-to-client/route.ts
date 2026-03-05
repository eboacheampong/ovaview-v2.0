import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateWeeklyReport, generateMonthlyReport } from '@/lib/ai-report-service'
import { sendWeeklyReportEmail, sendMonthlyReportEmail } from '@/lib/report-emails'
import { cacheSentReport } from '@/lib/sent-report-cache'

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

    const customRange = startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined

    let emailsSent = 0
    const errors: string[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let reportData: any
    let subject = ''

    if (reportType === 'weekly') {
      reportData = await generateWeeklyReport(clientId, undefined, customRange)
      subject = `Media & AI Insights: ${client.name}`
      for (const r of recipients) {
        try { await sendWeeklyReportEmail(reportData, r.email, r.name); emailsSent++ }
        catch (e) { errors.push(`${r.email}: ${e instanceof Error ? e.message : String(e)}`) }
      }
    } else {
      reportData = await generateMonthlyReport(clientId, undefined, customRange)
      subject = `AI Insights Report: ${client.name}`
      for (const r of recipients) {
        try { await sendMonthlyReportEmail(reportData, r.email, r.name); emailsSent++ }
        catch (e) { errors.push(`${r.email}: ${e instanceof Error ? e.message : String(e)}`) }
      }
    }

    // Cache the sent report
    if (emailsSent > 0) {
      const cacheType = customRange
        ? (reportType === 'weekly' ? 'custom_media' : 'custom_ai')
        : reportType
      await cacheSentReport({
        clientId,
        clientName: client.name,
        reportType: cacheType,
        subject,
        recipients: recipients.map(r => r.email),
        reportData,
        dateRangeStart: reportData.dateRange?.start,
        dateRangeEnd: reportData.dateRange?.end,
        emailsSent,
      })
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
