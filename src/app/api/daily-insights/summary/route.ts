import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/daily-insights/summary
 * Returns article counts grouped by client with pending/accepted breakdown
 * No "unassigned" — every article belongs to at least one client
 */
export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: 'asc' },
    })

    const clientSummaries = await Promise.all(
      clients.map(async (client) => {
        const [pending, accepted, total] = await Promise.all([
          prisma.dailyInsight.count({ where: { clientId: client.id, status: 'pending' } }),
          prisma.dailyInsight.count({ where: { clientId: client.id, status: 'accepted' } }),
          prisma.dailyInsight.count({ where: { clientId: client.id } }),
        ])
        return { id: client.id, name: client.name, logoUrl: client.logoUrl, pending, accepted, total }
      })
    )

    return NextResponse.json({ clients: clientSummaries })
  } catch (error) {
    console.error('Error fetching daily insights summary:', error)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}
