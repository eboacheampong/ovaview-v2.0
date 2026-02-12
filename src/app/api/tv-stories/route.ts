import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSlug } from '@/lib/slug'

// Validation helper for sentiment fields
function validateSentimentFields(body: {
  sentimentPositive?: number | null
  sentimentNeutral?: number | null
  sentimentNegative?: number | null
  overallSentiment?: string | null
}): { valid: boolean; error?: string } {
  const { sentimentPositive, sentimentNeutral, sentimentNegative, overallSentiment } = body

  const sentimentValues = [
    { name: 'sentimentPositive', value: sentimentPositive },
    { name: 'sentimentNeutral', value: sentimentNeutral },
    { name: 'sentimentNegative', value: sentimentNegative },
  ]

  for (const { name, value } of sentimentValues) {
    if (value !== undefined && value !== null) {
      if (typeof value !== 'number' || value < 0 || value > 100) {
        return { valid: false, error: 'Sentiment percentages must be between 0 and 100' }
      }
    }
  }

  if (overallSentiment !== undefined && overallSentiment !== null) {
    const validSentiments = ['positive', 'neutral', 'negative']
    if (!validSentiments.includes(overallSentiment)) {
      return { valid: false, error: 'Overall sentiment must be positive, neutral, or negative' }
    }
  }

  return { valid: true }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit
    const where = search
      ? { OR: [{ title: { contains: search, mode: 'insensitive' as const } }, { summary: { contains: search, mode: 'insensitive' as const } }] }
      : {}

    const [stories, total] = await Promise.all([
      prisma.tVStory.findMany({
        where,
        include: { station: true, program: true, industry: true, subIndustries: { include: { subIndustry: true } } },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.tVStory.count({ where }),
    ])

    return NextResponse.json({ stories, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (error) {
    console.error('Error fetching TV stories:', error)
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title, content, summary, presenters, keywords, videoUrl, videoTitle, date,
      stationId, programId, industryId, subIndustryIds,
      sentimentPositive, sentimentNeutral, sentimentNegative, overallSentiment
    } = body

    const validation = validateSentimentFields({ sentimentPositive, sentimentNeutral, sentimentNegative, overallSentiment })
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Generate unique slug from title
    const baseSlug = generateSlug(title)
    let slug = baseSlug
    let counter = 1
    while (await prisma.tVStory.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const story = await prisma.tVStory.create({
      data: {
        title, slug, content, summary, presenters, keywords, videoUrl, videoTitle,
        date: new Date(date),
        stationId: stationId || null,
        programId: programId || null,
        industryId: industryId || null,
        sentimentPositive: sentimentPositive ?? null,
        sentimentNeutral: sentimentNeutral ?? null,
        sentimentNegative: sentimentNegative ?? null,
        overallSentiment: overallSentiment ?? null,
        subIndustries: subIndustryIds?.length ? { create: subIndustryIds.map((id: string) => ({ subIndustryId: id })) } : undefined,
      },
      include: { station: true, program: true, industry: true, subIndustries: { include: { subIndustry: true } } },
    })

    return NextResponse.json(story, { status: 201 })
  } catch (error) {
    console.error('Error creating TV story:', error)
    return NextResponse.json({ error: 'Failed to create story' }, { status: 500 })
  }
}
