import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSlug } from '@/lib/slug'

export const dynamic = 'force-dynamic'

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
      prisma.printStory.findMany({
        where,
        include: { publication: true, issue: true, industry: true, subIndustries: { include: { subIndustry: true } }, images: true },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.printStory.count({ where }),
    ])

    return NextResponse.json({ stories, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (error) {
    console.error('Error fetching print stories:', error)
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      content,
      summary,
      author,
      pageNumbers,
      keywords,
      date,
      publicationId,
      issueName,
      industryId,
      subIndustryIds,
      images,
      sentimentPositive,
      sentimentNeutral,
      sentimentNegative,
      overallSentiment,
    } = body

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
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
    let slug = baseSlug || `print-story-${Date.now()}`
    let counter = 1
    while (await prisma.printStory.findUnique({ where: { slug } })) {
      slug = `${baseSlug || 'print-story'}-${counter}`
      counter++
    }

    // Handle issue - find existing or create new
    let issueId: string | null = null
    if (issueName && publicationId) {
      // Check if issue already exists for this publication
      const existingIssue = await prisma.printIssue.findFirst({
        where: {
          publicationId,
          name: { equals: issueName, mode: 'insensitive' },
        },
      })

      if (existingIssue) {
        issueId = existingIssue.id
      } else {
        // Create new issue
        const newIssue = await prisma.printIssue.create({
          data: {
            name: issueName,
            publicationId,
            issueDate: date ? new Date(date) : null,
          },
        })
        issueId = newIssue.id
      }
    }

    const story = await prisma.printStory.create({
      data: {
        title: title.trim(),
        slug,
        content: content || null,
        summary: summary || null,
        author: author || null,
        pageNumbers: pageNumbers || null,
        keywords: keywords || null,
        date: new Date(date),
        publicationId: publicationId || null,
        issueId,
        industryId: industryId || null,
        sentimentPositive: sentimentPositive ?? null,
        sentimentNeutral: sentimentNeutral ?? null,
        sentimentNegative: sentimentNegative ?? null,
        overallSentiment: overallSentiment ?? null,
        subIndustries: subIndustryIds?.length
          ? { create: subIndustryIds.map((id: string) => ({ subIndustryId: id })) }
          : undefined,
        images: images?.length
          ? { create: images.map((img: { url: string; caption?: string }) => ({ url: img.url, caption: img.caption || null })) }
          : undefined,
      },
      include: {
        publication: true,
        issue: true,
        industry: true,
        subIndustries: { include: { subIndustry: true } },
        images: true,
      },
    })

    return NextResponse.json(story, { status: 201 })
  } catch (error) {
    console.error('Error creating print story:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create story'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
