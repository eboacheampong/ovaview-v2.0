import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateWeeklyReport, generateMonthlyReport } from '@/lib/ai-report-service'
import { sendWeeklyReportEmail, sendMonthlyReportEmail } from '@/lib/report-emails'

export const dynamic = 'force-dynamic'
// Allow longer execution for AI report generation
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

    // Get notification setting with client and users
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

    // Gather recipients
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
      return NextResponse.json({
        success: false,
        error: 'No recipients found',
        emailsSent: 0,
      }, { status: 400 })
    }

    console.log(`[Report] Generating ${reportType} report for ${setting.client.name}`)

    // Generate report data with AI
    let emailsSent = 0
    const errors: string[] = []

    if (reportType === 'weekly') {
      const reportData = await generateWeeklyReport(setting.clientId)

      for (const recipient of recipients) {
        try {
          await sendWeeklyReportEmail(reportData, recipient.email, recipient.name)
          emailsSent++
        } catch (err) {
          errors.push(`${recipient.email}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    } else {
      const reportData = await generateMonthlyReport(setting.clientId)

      for (const recipient of recipients) {
        try {
          await sendMonthlyReportEmail(reportData, recipient.email, recipient.name)
          emailsSent++
        } catch (err) {
          errors.push(`${recipient.email}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    }

    // Log the email
    await prisma.emailLog.create({
      data: {
        recipient: recipients.map(r => r.email).join(', '),
        subject: `${reportType === 'weekly' ? 'Weekly' : 'Monthly AI Insights'} Report for ${setting.client.name}`,
        status: emailsSent > 0 ? 'sent' : 'failed',
        errorMessage: errors.length > 0 ? errors.join('; ') : null,
      },
    })

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
