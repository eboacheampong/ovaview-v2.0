import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { generateSlug } from '@/lib/slug'

// Validation helper for sentiment fields
function validateSentimentFields(body: {
  sentimentPositive?: number | null
  sentimentNeutral?: number | null
  sentimentNegative?: number | null
  overallSentiment?: string | null
}): { valid: boolean; error?: string } {
  const { sentimentPositive, sentimentNeutral, sentimentNegative, overallSentiment } = body

  // Validate sentiment percentages are between 0 and 100
  const sentimentValues = [
    { name: 'sentimentPositive', value: sentimentPositive },
    { name: 'sentimentNeutral', value: sentimentNeutral },
    { name: 'sentimentNegative', value: sentimentNegative },
  ]

  for (const { name, value } of sentimentValues) {
    if (value !== undefined && value !== null) {
      if (typeof value !== 'number' || value < 0 || value > 100) {
        return {
          valid: false,
          error: 'Sentiment percentages must be between 0 and 100',
        }
      }
    }
  }

  // Validate overallSentiment is one of the allowed values
  if (overallSentiment !== undefined && overallSentiment !== null) {
    const validSentiments = ['positive', 'neutral', 'negative']
    if (!validSentiments.includes(overallSentiment)) {
      return {
        valid: false,
        error: 'Overall sentiment must be positive, neutral, or negative',
      }
    }
  }

  return { valid: true }
}

// GET all web stories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { summary: { contains: search, mode: 'insensitive' as const } },
            { author: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [stories, total] = await Promise.all([
      prisma.webStory.findMany({
        where,
        include: {
          publication: true,
          industry: true,
          subIndustries: { include: { subIndustry: true } },
          images: true,
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.webStory.count({ where }),
    ])

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
    console.error('Error fetching web stories:', error)
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 })
  }
}

// POST create new web story
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received body:', JSON.stringify(body, null, 2))
    
    const {
      title,
      content,
      summary,
      author,
      sourceUrl,
      keywords,
      date,
      publicationId,
      industryId,
      subIndustryIds,
      images,
      sentimentPositive,
      sentimentNeutral,
      sentimentNegative,
      overallSentiment,
    } = body

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!date) {
      return NextResponse.json({ error: 'Publication date is required' }, { status: 400 })
    }

    // Validate date
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    // Validate sentiment fields
    const validation = validateSentimentFields({
      sentimentPositive,
      sentimentNeutral,
      sentimentNegative,
      overallSentiment,
    })
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Generate unique slug from title
    const baseSlug = generateSlug(title)
    let slug = baseSlug
    let counter = 1
    
    // Check for existing slugs and make unique if needed
    while (await prisma.webStory.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    console.log('Creating story with slug:', slug)

    const story = await prisma.webStory.create({
      data: {
        title: title.trim(),
        slug,
        content: content || null,
        summary: summary || null,
        author: author || null,
        sourceUrl: sourceUrl || null,
        keywords: keywords || null,
        date: parsedDate,
        publicationId: publicationId || null,
        industryId: industryId || null,
        sentimentPositive: sentimentPositive ?? null,
        sentimentNeutral: sentimentNeutral ?? null,
        sentimentNegative: sentimentNegative ?? null,
        overallSentiment: overallSentiment ?? null,
        subIndustries: subIndustryIds?.length
          ? {
              create: subIndustryIds.map((id: string) => ({
                subIndustryId: id,
              })),
            }
          : undefined,
        images: images?.length
          ? {
              create: images.map((img: { url: string; caption?: string }) => ({
                url: img.url,
                caption: img.caption || null,
              })),
            }
          : undefined,
      },
      include: {
        publication: true,
        industry: true,
        subIndustries: { include: { subIndustry: true } },
        images: true,
      },
    })

    console.log('Story created successfully:', story.id)
    return NextResponse.json(story, { status: 201 })
  } catch (error) {
    console.error('Error creating web story:', error)
    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorCode = error instanceof Error && 'code' in error ? (error as { code: string }).code : undefined
    
    console.error('Error details:', { message: errorMessage, code: errorCode, stack: errorStack })
    
    return NextResponse.json({ 
      error: 'Failed to create story', 
      details: errorMessage,
      code: errorCode 
    }, { status: 500 })
  }
}
