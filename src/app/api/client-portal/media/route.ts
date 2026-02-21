import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Secure endpoint for client portal - only returns media matching client keywords
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const mediaType = searchParams.get('mediaType') || 'web'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    // Get client and their keywords
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        keywords: { include: { keyword: true } },
        industries: { include: { industry: true } },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Build keyword list for filtering - include client name and all keywords
    const clientKeywords = [
      client.name.toLowerCase(),
      ...(client.newsKeywords?.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) || []),
      ...client.keywords.map(ck => ck.keyword.name.toLowerCase()),
    ].filter(Boolean)

    const industryIds = client.industries.map(ci => ci.industryId)

    const skip = (page - 1) * limit

    // Build keyword search conditions for database query
    // This searches for ANY of the client keywords in title, content, keywords, or summary
    const keywordSearchConditions = clientKeywords.flatMap(kw => [
      { title: { contains: kw, mode: 'insensitive' as const } },
      { content: { contains: kw, mode: 'insensitive' as const } },
      { keywords: { contains: kw, mode: 'insensitive' as const } },
      { summary: { contains: kw, mode: 'insensitive' as const } },
    ])

    // Build user search filter (when user types in search box)
    const userSearchConditions = search
      ? [
          { title: { contains: search, mode: 'insensitive' as const } },
          { summary: { contains: search, mode: 'insensitive' as const } },
          { keywords: { contains: search, mode: 'insensitive' as const } },
        ]
      : []

    // Combined filter: must match client keywords AND (optionally) user search
    const buildWhereClause = () => {
      const keywordFilter = keywordSearchConditions.length > 0
        ? { OR: keywordSearchConditions }
        : {}
      
      const industryFilter = industryIds.length > 0
        ? { industryId: { in: industryIds } }
        : {}

      // Stories must match EITHER keywords OR be in client's industries
      const clientFilter = {
        OR: [
          keywordFilter,
          industryFilter,
        ].filter(f => Object.keys(f).length > 0)
      }

      if (userSearchConditions.length > 0) {
        return {
          AND: [
            clientFilter,
            { OR: userSearchConditions },
          ],
        }
      }

      return clientFilter
    }

    let stories: unknown[] = []
    let total = 0

    const whereClause = buildWhereClause()

    switch (mediaType) {
      case 'web': {
        const [webStories, count] = await Promise.all([
          prisma.webStory.findMany({
            where: whereClause,
            include: {
              publication: true,
              industry: true,
              images: true,
            },
            orderBy: { date: 'desc' },
            skip,
            take: limit,
          }),
          prisma.webStory.count({ where: whereClause }),
        ])
        stories = webStories
        total = count
        break
      }

      case 'tv': {
        const [tvStories, count] = await Promise.all([
          prisma.tVStory.findMany({
            where: whereClause,
            include: {
              station: true,
              program: true,
              industry: true,
            },
            orderBy: { date: 'desc' },
            skip,
            take: limit,
          }),
          prisma.tVStory.count({ where: whereClause }),
        ])
        stories = tvStories
        total = count
        break
      }

      case 'radio': {
        const [radioStories, count] = await Promise.all([
          prisma.radioStory.findMany({
            where: whereClause,
            include: {
              station: true,
              program: true,
              industry: true,
            },
            orderBy: { date: 'desc' },
            skip,
            take: limit,
          }),
          prisma.radioStory.count({ where: whereClause }),
        ])
        stories = radioStories
        total = count
        break
      }

      case 'print': {
        const [printStories, count] = await Promise.all([
          prisma.printStory.findMany({
            where: whereClause,
            include: {
              publication: true,
              issue: true,
              industry: true,
              images: true,
            },
            orderBy: { date: 'desc' },
            skip,
            take: limit,
          }),
          prisma.printStory.count({ where: whereClause }),
        ])
        stories = printStories
        total = count
        break
      }
    }

    return NextResponse.json({
      stories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      // Debug info (can be removed in production)
      debug: {
        clientKeywords,
        industryIds,
      },
    })
  } catch (error) {
    console.error('Client portal media error:', error)
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
  }
}
