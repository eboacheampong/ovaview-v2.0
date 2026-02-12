import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const pub = await prisma.webPublication.findUnique({ where: { id } })
    if (!pub) return NextResponse.json({ error: 'Publication not found' }, { status: 404 })
    return NextResponse.json(pub)
  } catch (error) {
    console.error('Error fetching web publication:', error)
    return NextResponse.json({ error: 'Failed to fetch publication' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, website, location, reach, region, isActive } = body

    const updated = await prisma.webPublication.update({
      where: { id },
      data: {
        name,
        website,
        location,
        reach: reach ?? undefined,
        region,
        isActive: isActive ?? undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating web publication:', error)
    return NextResponse.json({ error: 'Failed to update publication' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.webPublication.delete({ where: { id } })
    return NextResponse.json({ message: 'Publication deleted' })
  } catch (error) {
    console.error('Error deleting web publication:', error)
    return NextResponse.json({ error: 'Failed to delete publication' }, { status: 500 })
  }
}
