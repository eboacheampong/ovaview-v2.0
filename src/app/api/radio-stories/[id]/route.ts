import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const story = await prisma.radioStory.findUnique({
      where: { id },
      include: { station: true, program: true, industry: true, subIndustries: { include: { subIndustry: true } } },
    })
    if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    return NextResponse.json(story)
  } catch (error) {
    console.error('Error fetching radio story:', error)
    return NextResponse.json({ error: 'Failed to fetch story' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      title, content, summary, presenters, keywords, audioUrl, audioTitle, date,
      stationId, programId, industryId, subIndustryIds,
      sentimentPositive, sentimentNeutral, sentimentNegative, overallSentiment
    } = body

    const validation = validateSentimentFields({ sentimentPositive, sentimentNeutral, sentimentNegative, overallSentiment })
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    await prisma.radioStorySubIndustry.deleteMany({ where: { radioStoryId: id } })

    const story = await prisma.radioStory.update({
      where: { id },
      data: {
        title, content, summary, presenters, keywords, audioUrl, audioTitle,
        date: new Date(date),
        stationId: stationId || null,
        programId: programId || null,
        industryId: industryId || null,
        sentimentPositive: sentimentPositive ?? null,
        sentimentNeutral: sentimentNeutral ?? null,
        sentimentNegative: sentimentNegative ?? null,
        overallSentiment: overallSentiment ?? null,
        subIndustries: subIndustryIds?.length ? { create: subIndustryIds.map((subId: string) => ({ subIndustryId: subId })) } : undefined,
      },
      include: { station: true, program: true, industry: true, subIndustries: { include: { subIndustry: true } } },
    })
    return NextResponse.json(story)
  } catch (error) {
    console.error('Error updating radio story:', error)
    return NextResponse.json({ error: 'Failed to update story' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.radioStory.delete({ where: { id } })
    return NextResponse.json({ message: 'Story deleted successfully' })
  } catch (error) {
    console.error('Error deleting radio story:', error)
    return NextResponse.json({ error: 'Failed to delete story' }, { status: 500 })
  }
}
