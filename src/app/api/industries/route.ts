import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const industries = await prisma.industry.findMany({
      include: {
        subIndustries: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(industries)
  } catch (error) {
    console.error('Failed to fetch industries:', error)
    return NextResponse.json({ error: 'Failed to fetch industries' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, parentId } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (parentId) {
      // Creating a sub-industry
      const subIndustry = await prisma.subIndustry.create({
        data: {
          name: name.trim(),
          industryId: parentId,
        },
      })
      return NextResponse.json(subIndustry, { status: 201 })
    } else {
      // Creating a top-level industry
      const industry = await prisma.industry.create({
        data: {
          name: name.trim(),
        },
        include: {
          subIndustries: true,
        },
      })
      return NextResponse.json(industry, { status: 201 })
    }
  } catch (error) {
    console.error('Failed to create industry:', error)
    return NextResponse.json({ error: 'Failed to create industry' }, { status: 500 })
  }
}
