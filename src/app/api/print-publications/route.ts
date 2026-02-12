import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const publications = await prisma.printPublication.findMany({
      where: { isActive: true },
      include: { issues: { where: { isActive: true }, orderBy: { issueDate: 'desc' } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(publications)
  } catch (error) {
    console.error('Error fetching print publications:', error)
    return NextResponse.json({ error: 'Failed to fetch publications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body
    const publication = await prisma.printPublication.create({ data: { name } })
    return NextResponse.json(publication, { status: 201 })
  } catch (error) {
    console.error('Error creating print publication:', error)
    return NextResponse.json({ error: 'Failed to create publication' }, { status: 500 })
  }
}
