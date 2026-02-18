import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.tenderViewLog.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { viewedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.tenderViewLog.count(),
    ])

    return NextResponse.json({
      data: logs.map(log => ({
        id: log.id,
        userId: log.userId,
        user: { id: log.user.id, username: log.user.name },
        tenderId: log.tenderId,
        tenderTitle: log.tenderTitle,
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
    console.error('Error fetching tender logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, tenderId, tenderTitle } = body

    const log = await prisma.tenderViewLog.create({
      data: {
        userId,
        tenderId,
        tenderTitle,
      },
    })

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('Error creating tender log:', error)
    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 })
  }
}
