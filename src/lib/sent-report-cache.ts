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
  const expiresAt = new Date(sentAt.getTime() + 24 * 60 * 60 * 1000) // 24h

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
