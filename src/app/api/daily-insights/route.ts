import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DailyInsightStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/daily-insights
 * Fetch daily insights articles for a specific client
 * Query params: clientId, limit, offset, status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const statusParam = searchParams.get('status') || 'pending'

    // Validate status is a valid enum value
    const validStatuses: DailyInsightStatus[] = ['pending', 'accepted', 'archived']
    const status = validStatuses.includes(statusParam as DailyInsightStatus) 
      ? (statusParam as DailyInsightStatus)
      : 'pending'

    const where: any = {}
    
    // Support 'all' status to get everything, or filter by specific status
    if (statusParam !== 'all') {
      where.status = status
    }
    
    // Support 'unassigned' as a special clientId value
    if (clientId === 'unassigned') {
      where.clientId = null
    } else if (clientId) {
      where.clientId = clientId
    }

    const articles = await prisma.dailyInsight.findMany({
      where,
      orderBy: { scrapedAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.dailyInsight.count({ where })

    return NextResponse.json({
      articles,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching daily insights:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/daily-insights/save
 * Save a scraped article to the database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, url, description, source, industry, clientId, scrapedAt } = body

    if (!title || !url) {
      return NextResponse.json(
        { error: 'title and url are required' },
        { status: 400 }
      )
    }

    // Check if article already exists
    const existing = await prisma.dailyInsight.findFirst({
      where: {
        url,
        clientId,
      },
    })

    if (existing) {
      return NextResponse.json({
        id: existing.id,
        message: 'Article already exists',
      })
    }

    const article = await prisma.dailyInsight.create({
      data: {
        title,
        url,
        description: description || '',
        source: source || '',
        industry: industry || 'general',
        clientId: clientId || null,
        status: 'pending',
        scrapedAt: scrapedAt ? new Date(scrapedAt) : new Date(),
      },
    })

    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    console.error('Error saving article:', error)
    return NextResponse.json(
      { error: 'Failed to save article' },
      { status: 500 }
    )
  }
}
