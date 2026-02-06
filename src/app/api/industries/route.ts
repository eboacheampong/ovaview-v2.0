import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const industries = await prisma.industry.findMany({
      where: { isActive: true },
      include: { subIndustries: { where: { isActive: true }, orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(industries)
  } catch (error) {
    console.error('Error fetching industries:', error)
    return NextResponse.json({ error: 'Failed to fetch industries' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, subIndustries } = body
    const industry = await prisma.industry.create({
      data: {
        name,
        subIndustries: subIndustries?.length
          ? { create: subIndustries.map((sub: string) => ({ name: sub })) }
          : undefined,
      },
      include: { subIndustries: true },
    })
    return NextResponse.json(industry, { status: 201 })
  } catch (error) {
    console.error('Error creating industry:', error)
    return NextResponse.json({ error: 'Failed to create industry' }, { status: 500 })
  }
}
