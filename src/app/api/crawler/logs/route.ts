import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET crawler logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const sourceId = searchParams.get('sourceId')
    const status = searchParams.get('status')

    const where: any = {}
    if (sourceId) where.sourceId = sourceId
    if (status) where.status = status

    const logs = await prisma.crawlerLog.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        source: { select: { name: true } },
      },
    })

    // Get summary stats
    const stats = await prisma.crawlerLog.groupBy({
      by: ['status'],
      _count: true,
      where: {
        startedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    })

    const totalArticles = await prisma.crawlerLog.aggregate({
      _sum: { articlesSaved: true },
      where: {
        startedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        status: 'success',
      },
    })

    return NextResponse.json({
      logs,
      stats: {
        byStatus: stats,
        totalArticlesLast24h: totalArticles._sum.articlesSaved || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching crawler logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}

// POST create crawler log entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sourceId,
      sourceName,
      sourceUrl,
      status,
      articlesFound,
      articlesSaved,
      duration,
      errorMessage,
      completedAt,
    } = body

    const log = await prisma.crawlerLog.create({
      data: {
        sourceId,
        sourceName,
        sourceUrl,
        status,
        articlesFound: articlesFound || 0,
        articlesSaved: articlesSaved || 0,
        duration: duration || 0,
        errorMessage,
        completedAt: completedAt ? new Date(completedAt) : null,
      },
    })

    // Update source stats if sourceId provided
    if (sourceId) {
      await prisma.crawlerSource.update({
        where: { id: sourceId },
        data: {
          lastCrawledAt: new Date(),
          articlesFound: { increment: articlesFound || 0 },
          errorCount: status === 'error' ? { increment: 1 } : undefined,
          lastError: status === 'error' ? errorMessage : null,
        },
      })
    }

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('Error creating crawler log:', error)
    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 })
  }
}
