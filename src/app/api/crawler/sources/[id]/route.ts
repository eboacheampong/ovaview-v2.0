import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET single crawler source
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const source = await prisma.crawlerSource.findUnique({
      where: { id: params.id },
      include: {
        logs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    return NextResponse.json(source)
  } catch (error) {
    console.error('Error fetching crawler source:', error)
    return NextResponse.json({ error: 'Failed to fetch source' }, { status: 500 })
  }
}

// PUT update crawler source
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, url, sourceType, industry, crawlFrequency, isActive } = body

    const source = await prisma.crawlerSource.update({
      where: { id: params.id },
      data: {
        name,
        url,
        sourceType,
        industry,
        crawlFrequency,
        isActive,
      },
    })

    return NextResponse.json(source)
  } catch (error) {
    console.error('Error updating crawler source:', error)
    return NextResponse.json({ error: 'Failed to update source' }, { status: 500 })
  }
}

// DELETE crawler source
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.crawlerSource.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting crawler source:', error)
    return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 })
  }
}
