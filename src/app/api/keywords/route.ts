import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const keywords = await prisma.keyword.findMany({
      include: {
        clients: {
          include: {
            client: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Transform to include client count and client list
    const transformed = keywords.map(k => ({
      id: k.id,
      name: k.name,
      isActive: k.isActive,
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
      clientCount: k.clients.length,
      clients: k.clients.map(ck => ck.client),
    }))

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Failed to fetch keywords:', error)
    return NextResponse.json({ error: 'Failed to fetch keywords' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, clientIds } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Keyword name is required' }, { status: 400 })
    }

    // Check if keyword already exists
    const existing = await prisma.keyword.findUnique({ where: { name: name.trim() } })
    
    if (existing) {
      // If keyword exists, just add the client associations
      if (clientIds && clientIds.length > 0) {
        for (const clientId of clientIds) {
          await prisma.clientKeyword.upsert({
            where: { clientId_keywordId: { clientId, keywordId: existing.id } },
            create: { clientId, keywordId: existing.id },
            update: {},
          })
        }
      }
      
      // Fetch updated keyword with clients
      const updated = await prisma.keyword.findUnique({
        where: { id: existing.id },
        include: {
          clients: { include: { client: { select: { id: true, name: true } } } },
        },
      })
      
      return NextResponse.json({
        ...updated,
        clientCount: updated?.clients.length || 0,
        clients: updated?.clients.map(ck => ck.client) || [],
      })
    }

    // Create new keyword with client associations
    const keyword = await prisma.keyword.create({
      data: {
        name: name.trim(),
        clients: clientIds && clientIds.length > 0 ? {
          create: clientIds.map((clientId: string) => ({ clientId })),
        } : undefined,
      },
      include: {
        clients: { include: { client: { select: { id: true, name: true } } } },
      },
    })

    return NextResponse.json({
      ...keyword,
      clientCount: keyword.clients.length,
      clients: keyword.clients.map(ck => ck.client),
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create keyword:', error)
    return NextResponse.json({ error: 'Failed to create keyword' }, { status: 500 })
  }
}
