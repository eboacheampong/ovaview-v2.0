import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/daily-insights/mark-accepted
 * Mark all insight rows with a given URL as accepted (across all clients)
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

    const result = await prisma.dailyInsight.updateMany({
      where: { url },
      data: { status: 'accepted' },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error('Error marking accepted:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
