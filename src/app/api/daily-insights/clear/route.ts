import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/daily-insights/clear
 * Delete all daily insight articles
 */
export async function DELETE() {
  try {
    const { count } = await prisma.dailyInsight.deleteMany({})
    return NextResponse.json({ success: true, deleted: count })
  } catch (error) {
    console.error('Error clearing insights:', error)
    return NextResponse.json({ error: 'Failed to clear insights' }, { status: 500 })
  }
}
