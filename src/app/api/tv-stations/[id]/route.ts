import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const station = await prisma.tVStation.findUnique({ where: { id }, include: { programs: { where: { isActive: true } } } })
    if (!station) return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    return NextResponse.json(station)
  } catch (error) {
    console.error('Error fetching TV station:', error)
    return NextResponse.json({ error: 'Failed to fetch station' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, location, reach, region, isActive, programs } = body

    if (Array.isArray(programs)) {
      await prisma.tVProgram.deleteMany({ where: { stationId: id } })
    }

    const updated = await prisma.tVStation.update({
      where: { id },
      data: {
        name,
        location,
        reach: reach ?? undefined,
        region,
        isActive: isActive ?? undefined,
        programs: Array.isArray(programs)
          ? { create: programs.map((p: any) => ({ name: p.name, startTime: p.startTime, endTime: p.endTime })) }
          : undefined,
      },
      include: { programs: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating TV station:', error)
    return NextResponse.json({ error: 'Failed to update station' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.tVStation.delete({ where: { id } })
    return NextResponse.json({ message: 'Station deleted' })
  } catch (error) {
    console.error('Error deleting TV station:', error)
    return NextResponse.json({ error: 'Failed to delete station' }, { status: 500 })
  }
}
