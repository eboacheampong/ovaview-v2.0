import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const keyword = await prisma.keyword.findUnique({
      where: { id },
      include: {
        clients: { include: { client: { select: { id: true, name: true } } } },
      },
    })

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...keyword,
      clientCount: keyword.clients.length,
      clients: keyword.clients.map(ck => ck.client),
    })
  } catch (error) {
    console.error('Failed to fetch keyword:', error)
    return NextResponse.json({ error: 'Failed to fetch keyword' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, clientIds } = body

    // Update keyword name
    const updateData: { name?: string } = {}
    if (name) updateData.name = name.trim()

    // Delete existing client associations and create new ones
    if (clientIds !== undefined) {
      await prisma.clientKeyword.deleteMany({ where: { keywordId: id } })
      
      if (clientIds.length > 0) {
        await prisma.clientKeyword.createMany({
          data: clientIds.map((clientId: string) => ({ clientId, keywordId: id })),
        })
      }
    }

    const keyword = await prisma.keyword.update({
      where: { id },
      data: updateData,
      include: {
        clients: { include: { client: { select: { id: true, name: true } } } },
      },
    })

    return NextResponse.json({
      ...keyword,
      clientCount: keyword.clients.length,
      clients: keyword.clients.map(ck => ck.client),
    })
  } catch (error) {
    console.error('Failed to update keyword:', error)
    return NextResponse.json({ error: 'Failed to update keyword' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.keyword.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete keyword:', error)
    return NextResponse.json({ error: 'Failed to delete keyword' }, { status: 500 })
  }
}

// Add client to keyword
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, clientId } = body

    if (action === 'addClient' && clientId) {
      await prisma.clientKeyword.upsert({
        where: { clientId_keywordId: { clientId, keywordId: id } },
        create: { clientId, keywordId: id },
        update: {},
      })
    } else if (action === 'removeClient' && clientId) {
      await prisma.clientKeyword.delete({
        where: { clientId_keywordId: { clientId, keywordId: id } },
      })
    }

    const keyword = await prisma.keyword.findUnique({
      where: { id },
      include: {
        clients: { include: { client: { select: { id: true, name: true } } } },
      },
    })

    return NextResponse.json({
      ...keyword,
      clientCount: keyword?.clients.length || 0,
      clients: keyword?.clients.map(ck => ck.client) || [],
    })
  } catch (error) {
    console.error('Failed to patch keyword:', error)
    return NextResponse.json({ error: 'Failed to update keyword' }, { status: 500 })
  }
}
