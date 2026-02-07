import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const skip = (page - 1) * limit
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}
    if (startDate || endDate) {
      where.visitedAt = {}
      if (startDate) (where.visitedAt as Record<string, Date>).gte = new Date(startDate)
      if (endDate) (where.visitedAt as Record<string, Date>).lte = new Date(endDate)
    }

    const [logs, total] = await Promise.all([
      prisma.visitLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { visitedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.visitLog.count({ where }),
    ])

    return NextResponse.json({
      data: logs.map(log => ({
        id: log.id,
        userId: log.userId,
        user: log.user ? { id: log.user.id, username: log.user.name } : null,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        page: log.page,
        articleId: log.articleId,
        mediaType: log.mediaType?.toLowerCase(),
        visitedAt: log.visitedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching visit logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, ipAddress, userAgent, page, articleId, mediaType } = body

    const log = await prisma.visitLog.create({
      data: {
        userId,
        ipAddress,
        userAgent,
        page,
        articleId,
        mediaType: mediaType?.toUpperCase(),
      },
      select: { id: true },
    })

    return NextResponse.json({ id: log.id }, { status: 201 })
  } catch (error) {
    console.error('Error creating visit log:', error)
    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 })
  }
}
