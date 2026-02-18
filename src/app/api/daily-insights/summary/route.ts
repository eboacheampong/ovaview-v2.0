import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/daily-insights/summary
 * Returns article counts grouped by client with pending/accepted breakdown
 */
export async function GET() {
  try {
    // Get all clients
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })

    // Get counts per client
    const clientSummaries = await Promise.all(
      clients.map(async (client) => {
        const [pending, accepted, total] = await Promise.all([
          prisma.dailyInsight.count({ where: { clientId: client.id, status: 'pending' } }),
          prisma.dailyInsight.count({ where: { clientId: client.id, status: 'accepted' } }),
          prisma.dailyInsight.count({ where: { clientId: client.id } }),
        ])
        return { id: client.id, name: client.name, pending, accepted, total }
      })
    )

    // Also get unassigned articles (no client)
    const [unassignedPending, unassignedAccepted, unassignedTotal] = await Promise.all([
      prisma.dailyInsight.count({ where: { clientId: null, status: 'pending' } }),
      prisma.dailyInsight.count({ where: { clientId: null, status: 'accepted' } }),
      prisma.dailyInsight.count({ where: { clientId: null } }),
    ])

    return NextResponse.json({
      clients: clientSummaries,
      unassigned: { pending: unassignedPending, accepted: unassignedAccepted, total: unassignedTotal },
    })
  } catch (error) {
    console.error('Error fetching daily insights summary:', error)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}
