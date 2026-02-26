import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET all crawler sources
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sourceType = searchParams.get('sourceType')
    const isActive = searchParams.get('isActive')

    const where: any = {}
    if (sourceType) where.sourceType = sourceType
    if (isActive !== null) where.isActive = isActive === 'true'

    const sources = await prisma.crawlerSource.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { logs: true } },
      },
    })

    return NextResponse.json({ sources })
  } catch (error) {
    console.error('Error fetching crawler sources:', error)
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 })
  }
}

// POST create new crawler source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, url, sourceType, industry, crawlFrequency, isActive } = body

    if (!name || !url) {
      return NextResponse.json({ error: 'name and url are required' }, { status: 400 })
    }

    // Check if URL already exists
    const existing = await prisma.crawlerSource.findUnique({ where: { url } })
    if (existing) {
      return NextResponse.json({ error: 'Source URL already exists' }, { status: 409 })
    }

    const source = await prisma.crawlerSource.create({
      data: {
        name,
        url,
        sourceType: sourceType || 'news',
        industry: industry || 'general',
        crawlFrequency: crawlFrequency || 60,
        isActive: isActive ?? true,
      },
    })

    return NextResponse.json(source, { status: 201 })
  } catch (error) {
    console.error('Error creating crawler source:', error)
    return NextResponse.json({ error: 'Failed to create source' }, { status: 500 })
  }
}
