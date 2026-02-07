import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Cap at 100
    const skip = (page - 1) * limit
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}
    if (clientId && clientId !== 'all') where.clientId = clientId
    
    // Date range filter for better performance on large tables
    if (startDate || endDate) {
      where.viewedAt = {}
      if (startDate) (where.viewedAt as Record<string, Date>).gte = new Date(startDate)
      if (endDate) (where.viewedAt as Record<string, Date>).lte = new Date(endDate)
    }

    const [logs, total] = await Promise.all([
      prisma.articleViewLog.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { viewedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.articleViewLog.count({ where }),
    ])

    return NextResponse.json({
      data: logs.map(log => ({
        id: log.id,
        clientId: log.clientId,
        clientName: log.client.name,
        userId: log.userId,
        userName: log.user.name,
        articleId: log.articleId,
        articleTitle: log.articleTitle,
        mediaType: log.mediaType.toLowerCase(),
        duration: log.duration,
        viewedAt: log.viewedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching article view logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, userId, articleId, articleTitle, mediaType, duration } = body

    // Use fire-and-forget for non-critical logging
    const log = await prisma.articleViewLog.create({
      data: {
        clientId,
        userId,
        articleId,
        articleTitle,
        mediaType: mediaType.toUpperCase(),
        duration: duration || 0,
      },
      select: { id: true }, // Only return ID for efficiency
    })

    return NextResponse.json({ id: log.id }, { status: 201 })
  } catch (error) {
    console.error('Error creating article view log:', error)
    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 })
  }
}
