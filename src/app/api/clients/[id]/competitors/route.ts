import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - List competitors for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const competitors = await prisma.clientCompetitor.findMany({
      where: { clientId: id, isActive: true },
      include: {
        competitorClient: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(competitors)
  } catch (error) {
    console.error('Failed to fetch competitors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch competitors' },
      { status: 500 }
    )
  }
}

// POST - Add a competitor
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { competitorClientId, competitorName, competitorKeywords } = body

    // Validate that either competitorClientId or competitorName is provided
    if (!competitorClientId && !competitorName) {
      return NextResponse.json(
        { error: 'Either competitorClientId or competitorName is required' },
        { status: 400 }
      )
    }

    // Check if competitor already exists
    if (competitorClientId) {
      const existing = await prisma.clientCompetitor.findFirst({
        where: { clientId: id, competitorClientId },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'This competitor is already added' },
          { status: 400 }
        )
      }
    }

    const competitor = await prisma.clientCompetitor.create({
      data: {
        clientId: id,
        competitorClientId: competitorClientId || null,
        competitorName: competitorName || null,
        competitorKeywords: competitorKeywords || null,
      },
      include: {
        competitorClient: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
    })

    return NextResponse.json(competitor, { status: 201 })
  } catch (error) {
    console.error('Failed to add competitor:', error)
    return NextResponse.json(
      { error: 'Failed to add competitor' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a competitor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const competitorId = searchParams.get('competitorId')

    if (!competitorId) {
      return NextResponse.json(
        { error: 'competitorId is required' },
        { status: 400 }
      )
    }

    await prisma.clientCompetitor.delete({
      where: { id: competitorId, clientId: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove competitor:', error)
    return NextResponse.json(
      { error: 'Failed to remove competitor' },
      { status: 500 }
    )
  }
}
