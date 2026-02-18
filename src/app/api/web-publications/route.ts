import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const publications = await prisma.webPublication.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(publications)
  } catch (error) {
    console.error('Error fetching web publications:', error)
    return NextResponse.json({ error: 'Failed to fetch publications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, website, location, reach, isActive } = body
    const publication = await prisma.webPublication.create({
      data: {
        name,
        website: website || null,
        location: location || null,
        reach: reach ? parseInt(reach) : 0,
        isActive: isActive !== false,
      },
    })
    return NextResponse.json(publication, { status: 201 })
  } catch (error) {
    console.error('Error creating web publication:', error)
    return NextResponse.json({ error: 'Failed to create publication' }, { status: 500 })
  }
}
