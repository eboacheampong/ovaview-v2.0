import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status && status !== 'all') where.status = status

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.emailLog.count({ where }),
    ])

    return NextResponse.json({
      data: logs.map(log => ({
        id: log.id,
        recipient: log.recipient,
        subject: log.subject,
        articleId: log.articleId,
        articleType: log.articleType?.toLowerCase(),
        status: log.status,
        errorMessage: log.errorMessage,
        sentAt: log.sentAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching email logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipient, subject, articleId, articleType, status, errorMessage } = body

    const log = await prisma.emailLog.create({
      data: {
        recipient,
        subject,
        articleId,
        articleType: articleType?.toUpperCase(),
        status,
        errorMessage,
      },
    })

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('Error creating email log:', error)
    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 })
  }
}
