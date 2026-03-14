import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateWeeklyReport } from '@/lib/ai-report-service'
import { sendWeeklyReportEmail } from '@/lib/report-emails'
import { cacheSentReport } from '@/lib/sent-report-cache'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any
const CRON_SECRET = process.env.CRON_SECRET

// Runs every Sunday at 6 PM (18:00) in the client's timezone
// External cron should call this at 18:00 UTC on Sundays
// Vercel cron config: "0 18 * * 0"
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all active notification settings with weekly enabled
    const settings = await db.clientNotificationSetting.findMany({
      where: { isActive: true, emailEnabled: true, weeklyEnabled: true },
      include: {
        client: {
          include: {
            users: {
              where: { isActive: true },
              select: { name: true, email: true },
            },
          },
        },
      },
    })

    let sent = 0
    const errors: string[] = []

    for (const setting of settings) {
      if (!setting.client.isActive) continue

      try {
        const reportData = await generateWeeklyReport(setting.clientId)

        const recipients: { email: string; name?: string }[] = []
        if (setting.client.email) {
          recipients.push({ email: setting.client.email, name: setting.client.name })
        }
        for (const user of setting.client.users) {
          if (user.email && !recipients.some((r: { email: string }) => r.email === user.email)) {
            recipients.push({ email: user.email, name: user.name })
          }
        }

        for (const r of recipients) {
          try {
            await sendWeeklyReportEmail(reportData, r.email, r.name)
            sent++
          } catch (err) {
            errors.push(`${setting.client.name}/${r.email}: ${err instanceof Error ? err.message : String(err)}`)
          }
        }

        // Log
        if (recipients.length > 0) {
          await prisma.emailLog.create({
            data: {
              recipient: recipients.map(r => r.email).join(', '),
              subject: `Weekly Report for ${setting.client.name}`,
              status: 'sent',
            },
          })

          // Cache report for client dashboard insights
          await cacheSentReport({
            clientId: setting.clientId,
            clientName: setting.client.name,
            reportType: 'weekly',
            subject: `Weekly Report for ${setting.client.name}`,
            recipients: recipients.map(r => r.email),
            reportData,
            dateRangeStart: reportData.dateRange?.start,
            dateRangeEnd: reportData.dateRange?.end,
            emailsSent: sent,
          })
        }
      } catch (err) {
        errors.push(`${setting.client.name}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return NextResponse.json({
      success: true,
      clientsProcessed: settings.length,
      emailsSent: sent,
      errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[WeeklyCron] Failed:', error)
    return NextResponse.json({ error: 'Failed to process weekly reports' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
