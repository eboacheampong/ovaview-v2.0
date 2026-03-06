import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get all active clients
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: 'asc' },
    })

    const clientSummaries = await Promise.all(
      clients.map(async (client) => {
        const total = await prisma.socialPost.count({ where: { clientId: client.id } })
        // Count posts from last 7 days as "recent"
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const recent = await prisma.socialPost.count({
          where: { clientId: client.id, createdAt: { gte: weekAgo } },
        })

        // Platform breakdown
        const platforms = await prisma.socialPost.groupBy({
          by: ['platform'],
          where: { clientId: client.id },
          _count: true,
        })

        return {
          id: client.id,
          name: client.name,
          logoUrl: client.logoUrl,
          total,
          recent,
          platforms: platforms.map(p => ({ platform: p.platform, count: p._count })),
        }
      })
    )

    return NextResponse.json({ clients: clientSummaries })
  } catch (error) {
    console.error('Failed to fetch social insights summary:', error)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}
