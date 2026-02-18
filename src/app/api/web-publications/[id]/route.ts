import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, website, location, reach, isActive } = body
    const publication = await prisma.webPublication.update({
      where: { id: params.id },
      data: {
        name,
        website: website || null,
        location: location || null,
        reach: reach ? parseInt(reach) : 0,
        isActive: isActive !== false,
      },
    })
    return NextResponse.json(publication)
  } catch (error) {
    console.error('Error updating web publication:', error)
    return NextResponse.json({ error: 'Failed to update publication' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.webPublication.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting web publication:', error)
    return NextResponse.json({ error: 'Failed to delete publication' }, { status: 500 })
  }
}
