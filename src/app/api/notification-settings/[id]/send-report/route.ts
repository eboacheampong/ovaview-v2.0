import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateWeeklyReport, generateMonthlyReport } from '@/lib/ai-report-service'
import { sendWeeklyReportEmail, sendMonthlyReportEmail } from '@/lib/report-emails'
import { cacheSentReport } from '@/lib/sent-report-cache'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const reportType: 'weekly' | 'monthly' = body.reportType

    if (!reportType || !['weekly', 'monthly'].includes(reportType)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    const setting = await db.clientNotificationSetting.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            users: {
              where: { isActive: true },
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    })

    if (!setting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
    }

    const recipients: { email: string; name?: string }[] = []
    if (setting.client.email) {
      recipients.push({ email: setting.client.email, name: setting.client.name })
    }
    for (const user of setting.client.users) {
      if (user.email && !recipients.some((r: { email: string }) => r.email === user.email)) {
        recipients.push({ email: user.email, name: user.name })
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ success: false, error: 'No recipients found', emailsSent: 0 }, { status: 400 })
    }

    console.log(`[Report] Generating ${reportType} report for ${setting.client.name}`)

    let emailsSent = 0
    const errors: string[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let reportData: any

    if (reportType === 'weekly') {
      reportData = await generateWeeklyReport(setting.clientId)
      for (const recipient of recipients) {
        try { await sendWeeklyReportEmail(reportData, recipient.email, recipient.name); emailsSent++ }
        catch (err) { errors.push(`${recipient.email}: ${err instanceof Error ? err.message : String(err)}`) }
      }
    } else {
      reportData = await generateMonthlyReport(setting.clientId)
      for (const recipient of recipients) {
        try { await sendMonthlyReportEmail(reportData, recipient.email, recipient.name); emailsSent++ }
        catch (err) { errors.push(`${recipient.email}: ${err instanceof Error ? err.message : String(err)}`) }
      }
    }

    // Log the email
    const subject = `${reportType === 'weekly' ? 'Weekly' : 'Monthly AI Insights'} Report for ${setting.client.name}`
    await prisma.emailLog.create({
      data: {
        recipient: recipients.map(r => r.email).join(', '),
        subject,
        status: emailsSent > 0 ? 'sent' : 'failed',
        errorMessage: errors.length > 0 ? errors.join('; ') : null,
      },
    })

    // Cache the sent report
    if (emailsSent > 0) {
      await cacheSentReport({
        clientId: setting.clientId,
        clientName: setting.client.name,
        reportType,
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
      reportType,
      error: errors.length > 0 ? errors.join('; ') : null,
    })
  } catch (error) {
    console.error('[Report] Failed to generate/send report:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      emailsSent: 0,
    }, { status: 500 })
  }
}
