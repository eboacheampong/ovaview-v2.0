import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const stations = await prisma.tVStation.findMany({
      where: { isActive: true },
      include: { programs: { where: { isActive: true } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(stations)
  } catch (error) {
    console.error('Error fetching TV stations:', error)
    return NextResponse.json({ error: 'Failed to fetch stations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, channel } = body
    const station = await prisma.tVStation.create({ data: { name, channel } })
    return NextResponse.json(station, { status: 201 })
  } catch (error) {
    console.error('Error creating TV station:', error)
    return NextResponse.json({ error: 'Failed to create station' }, { status: 500 })
  }
}
