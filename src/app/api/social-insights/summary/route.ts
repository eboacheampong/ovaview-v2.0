import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: 'asc' },
    })

    const clientSummaries = await Promise.all(
      clients.map(async (client) => {
        // Total scraped (pending) posts — the inbox
        const pending = await prisma.socialPost.count({
          where: { clientId: client.id, status: 'pending' },
        })
        // Total accepted (published) posts
        const accepted = await prisma.socialPost.count({
          where: { clientId: client.id, status: 'accepted' },
        })
        // Total across all statuses
        const total = await prisma.socialPost.count({
          where: { clientId: client.id },
        })
        // Recent pending posts from last 7 days
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const recent = await prisma.socialPost.count({
          where: { clientId: client.id, status: 'pending', createdAt: { gte: weekAgo } },
        })

        // Platform breakdown (pending only — what's in the inbox)
        const platforms = await prisma.socialPost.groupBy({
          by: ['platform'],
          where: { clientId: client.id, status: 'pending' },
          _count: true,
        })

        return {
          id: client.id,
          name: client.name,
          logoUrl: client.logoUrl,
          total,
          pending,
          accepted,
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
