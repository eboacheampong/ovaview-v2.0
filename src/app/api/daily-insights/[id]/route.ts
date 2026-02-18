import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/daily-insights/[id]
 * Update a daily insight (e.g. mark as accepted)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updated = await prisma.dailyInsight.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating insight:', error)
    return NextResponse.json({ error: 'Failed to update insight' }, { status: 500 })
  }
}

/**
 * DELETE /api/daily-insights/[id]
 * Delete a single daily insight
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.dailyInsight.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting insight:', error)
    return NextResponse.json({ error: 'Failed to delete insight' }, { status: 500 })
  }
}
