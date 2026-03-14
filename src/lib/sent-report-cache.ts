import { prisma } from '@/lib/prisma'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

export async function cacheSentReport(params: {
  clientId: string
  clientName: string
  reportType: string // 'daily' | 'weekly' | 'monthly' | 'custom_ai' | 'custom_media'
  subject: string
  recipients: string[]
  reportData: unknown
  dateRangeStart?: Date
  dateRangeEnd?: Date
  emailsSent: number
}): Promise<string> {
  const sentAt = new Date()
  const expiresAt = new Date(sentAt.getTime() + 24 * 60 * 60 * 1000) // 24h for resend window

  const record = await db.sentReport.create({
    data: {
      clientId: params.clientId,
      clientName: params.clientName,
      reportType: params.reportType,
      subject: params.subject,
      recipients: params.recipients.join(', '),
      reportData: JSON.stringify(params.reportData),
      dateRangeStart: params.dateRangeStart || null,
      dateRangeEnd: params.dateRangeEnd || null,
      emailsSent: params.emailsSent,
      sentAt,
      expiresAt,
    },
  })

  return record.id
}

/**
 * Get the latest sent report for a client by type.
 * Unlike the 24h resend cache, this always returns the most recent report
 * regardless of expiry — used for client dashboard insights display.
 */
export async function getLatestReport(clientId: string, reportType: string) {
  return db.sentReport.findFirst({
    where: { clientId, reportType },
    orderBy: { sentAt: 'desc' },
    select: {
      id: true,
      reportType: true,
      subject: true,
      reportData: true,
      dateRangeStart: true,
      dateRangeEnd: true,
      sentAt: true,
    },
  })
}

/**
 * Get the latest weekly AND monthly reports for a client in one call.
 */
export async function getLatestInsightsForClient(clientId: string) {
  const [weekly, monthly] = await Promise.all([
    getLatestReport(clientId, 'weekly'),
    getLatestReport(clientId, 'monthly'),
  ])

  return {
    weekly: weekly ? {
      id: weekly.id,
      reportType: weekly.reportType,
      subject: weekly.subject,
      reportData: safeParseJSON(weekly.reportData),
      dateRangeStart: weekly.dateRangeStart,
      dateRangeEnd: weekly.dateRangeEnd,
      sentAt: weekly.sentAt,
    } : null,
    monthly: monthly ? {
      id: monthly.id,
      reportType: monthly.reportType,
      subject: monthly.subject,
      reportData: safeParseJSON(monthly.reportData),
      dateRangeStart: monthly.dateRangeStart,
      dateRangeEnd: monthly.dateRangeEnd,
      sentAt: monthly.sentAt,
    } : null,
  }
}

function safeParseJSON(data: string): unknown {
  try { return JSON.parse(data) } catch { return null }
}
