import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const pub = await prisma.printPublication.findUnique({ where: { id }, include: { issues: { where: { isActive: true }, orderBy: { issueDate: 'desc' } } } })
    if (!pub) return NextResponse.json({ error: 'Publication not found' }, { status: 404 })
    return NextResponse.json(pub)
  } catch (error) {
    console.error('Error fetching print publication:', error)
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
    const { name, location, reach, region, isActive } = body

    const updated = await prisma.printPublication.update({
      where: { id },
      data: {
        name,
        location,
        reach: reach ?? undefined,
        region,
        isActive: isActive ?? undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating print publication:', error)
    return NextResponse.json({ error: 'Failed to update publication' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.printPublication.delete({ where: { id } })
    return NextResponse.json({ message: 'Publication deleted' })
  } catch (error) {
    console.error('Error deleting print publication:', error)
    return NextResponse.json({ error: 'Failed to delete publication' }, { status: 500 })
  }
}
