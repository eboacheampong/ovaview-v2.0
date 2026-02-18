import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mediaType = searchParams.get('mediaType')
    const action = searchParams.get('action')
    const publisher = searchParams.get('publisher')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (mediaType && mediaType !== 'all') where.mediaType = mediaType.toUpperCase()
    if (action && action !== 'all') where.action = action
    if (publisher && publisher !== 'all') where.publisher = publisher

    const [logs, total, publishers] = await Promise.all([
      prisma.mediaEntryLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.mediaEntryLog.count({ where }),
      prisma.mediaEntryLog.findMany({
        select: { publisher: true },
        distinct: ['publisher'],
        orderBy: { publisher: 'asc' },
      }),
    ])

    return NextResponse.json({
      data: logs.map(log => ({
        id: log.id,
        userId: log.userId,
        userName: log.user.name,
        mediaType: log.mediaType.toLowerCase(),
        publisher: log.publisher,
        storyId: log.storyId,
        storyTitle: log.storyTitle,
        action: log.action,
        timestamp: log.timestamp,
      })),
      publishers: publishers.map(p => p.publisher),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching media entry logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, mediaType, publisher, storyId, storyTitle, action } = body

    const log = await prisma.mediaEntryLog.create({
      data: {
        userId,
        mediaType: mediaType.toUpperCase(),
        publisher,
        storyId,
        storyTitle,
        action,
      },
    })

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('Error creating media entry log:', error)
    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 })
  }
}
