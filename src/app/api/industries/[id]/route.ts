import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { name, isSubIndustry } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (isSubIndustry) {
      const subIndustry = await prisma.subIndustry.update({
        where: { id },
        data: { name: name.trim() },
      })
      return NextResponse.json(subIndustry)
    } else {
      const industry = await prisma.industry.update({
        where: { id },
        data: { name: name.trim() },
        include: { subIndustries: true },
      })
      return NextResponse.json(industry)
    }
  } catch (error) {
    console.error('Failed to update industry:', error)
    return NextResponse.json({ error: 'Failed to update industry' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const isSubIndustry = searchParams.get('isSubIndustry') === 'true'

    if (isSubIndustry) {
      await prisma.subIndustry.delete({ where: { id } })
    } else {
      // Delete industry and all its sub-industries (cascade)
      await prisma.industry.delete({ where: { id } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete industry:', error)
    return NextResponse.json({ error: 'Failed to delete industry' }, { status: 500 })
  }
}
