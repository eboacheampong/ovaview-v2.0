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

    // Build keyword list for filtering
    const clientKeywords = [
      client.name.toLowerCase(),
      ...(client.newsKeywords?.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) || []),
      ...client.keywords.map(ck => ck.keyword.name.toLowerCase()),
    ].filter(Boolean)

    const industryIds = client.industries.map(ci => ci.industryId)

    const skip = (page - 1) * limit

    // Build search filter
    const searchFilter = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { summary: { contains: search, mode: 'insensitive' as const } },
            { keywords: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    // Industry filter - stories must be in client's industries
    const industryFilter = industryIds.length > 0
      ? { industryId: { in: industryIds } }
      : {}

    let stories: unknown[] = []
    let total = 0

    switch (mediaType) {
      case 'web': {
        const [webStories, webTotal] = await Promise.all([
          prisma.webStory.findMany({
            where: { ...searchFilter, ...industryFilter },
            include: {
              publication: true,
              industry: true,
              images: true,
            },
            orderBy: { date: 'desc' },
            skip,
            take: limit * 2, // Fetch more to filter by keywords
          }),
          prisma.webStory.count({ where: { ...searchFilter, ...industryFilter } }),
        ])

        // Filter by client keywords
        stories = webStories.filter(story => {
          const content = `${story.title} ${story.content || ''} ${story.keywords || ''}`.toLowerCase()
          return clientKeywords.some(kw => content.includes(kw))
        }).slice(0, limit)
        total = webTotal
        break
      }

      case 'tv': {
        const [tvStories, tvTotal] = await Promise.all([
          prisma.tVStory.findMany({
            where: { ...searchFilter, ...industryFilter },
            include: {
              station: true,
              program: true,
              industry: true,
            },
            orderBy: { date: 'desc' },
            skip,
            take: limit * 2,
          }),
          prisma.tVStory.count({ where: { ...searchFilter, ...industryFilter } }),
        ])

        stories = tvStories.filter(story => {
          const content = `${story.title} ${story.content || ''} ${story.keywords || ''}`.toLowerCase()
          return clientKeywords.some(kw => content.includes(kw))
        }).slice(0, limit)
        total = tvTotal
        break
      }

      case 'radio': {
        const [radioStories, radioTotal] = await Promise.all([
          prisma.radioStory.findMany({
            where: { ...searchFilter, ...industryFilter },
            include: {
              station: true,
              program: true,
              industry: true,
            },
            orderBy: { date: 'desc' },
            skip,
            take: limit * 2,
          }),
          prisma.radioStory.count({ where: { ...searchFilter, ...industryFilter } }),
        ])

        stories = radioStories.filter(story => {
          const content = `${story.title} ${story.content || ''} ${story.keywords || ''}`.toLowerCase()
          return clientKeywords.some(kw => content.includes(kw))
        }).slice(0, limit)
        total = radioTotal
        break
      }

      case 'print': {
        const [printStories, printTotal] = await Promise.all([
          prisma.printStory.findMany({
            where: { ...searchFilter, ...industryFilter },
            include: {
              publication: true,
              issue: true,
              industry: true,
              images: true,
            },
            orderBy: { date: 'desc' },
            skip,
            take: limit * 2,
          }),
          prisma.printStory.count({ where: { ...searchFilter, ...industryFilter } }),
        ])

        stories = printStories.filter(story => {
          const content = `${story.title} ${story.content || ''} ${story.keywords || ''}`.toLowerCase()
          return clientKeywords.some(kw => content.includes(kw))
        }).slice(0, limit)
        total = printTotal
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
    })
  } catch (error) {
    console.error('Client portal media error:', error)
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
  }
}
