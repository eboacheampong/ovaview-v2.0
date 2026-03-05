import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWeeklyReportEmail, sendMonthlyReportEmail } from '@/lib/report-emails'
import { sendNotificationEmail } from '@/lib/email'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(
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
      return NextResponse.json({ error: 'Report has expired. Please generate a new report.' }, { status: 410 })
    }

    const data = JSON.parse(report.reportData)
    const recipients = report.recipients.split(',').map((e: string) => e.trim()).filter(Boolean)

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients' }, { status: 400 })
    }

    let emailsSent = 0
    const errors: string[] = []
    const type = report.reportType

    for (const email of recipients) {
      try {
        if (type === 'weekly' || type === 'custom_media') {
          // Restore Date objects
          data.dateRange.start = new Date(data.dateRange.start)
          data.dateRange.end = new Date(data.dateRange.end)
          await sendWeeklyReportEmail(data, email)
        } else if (type === 'monthly' || type === 'custom_ai') {
          data.dateRange.start = new Date(data.dateRange.start)
          data.dateRange.end = new Date(data.dateRange.end)
          await sendMonthlyReportEmail(data, email)
        } else if (type === 'daily') {
          // Daily uses the notification email template
          const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          await sendNotificationEmail({
            clientName: report.clientName,
            recipientEmail: email,
            mediaItems: data.mediaItems || [],
            dashboardUrl: APP_URL,
          })
        }
        emailsSent++
      } catch (e) {
        errors.push(`${email}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    // Update the sent report record
    await db.sentReport.update({
      where: { id },
      data: { emailsSent: report.emailsSent + emailsSent },
    })

    return NextResponse.json({
      success: emailsSent > 0,
      emailsSent,
      error: errors.length > 0 ? errors.join('; ') : null,
    })
  } catch (error) {
    console.error('[SentReports] Resend failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resend' },
      { status: 500 }
    )
  }
}
