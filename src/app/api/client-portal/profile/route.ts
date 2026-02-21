import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Secure endpoint for client to view their own profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        webAddress: true,
        contactPerson: true,
        logoUrl: true,
        expiryDate: true,
        isActive: true,
        newsEmailAlerts: true,
        newsSmsAlerts: true,
        tenderEmailAlerts: true,
        tenderSmsAlerts: true,
        industries: {
          include: { industry: { select: { id: true, name: true } } },
        },
        keywords: {
          include: { keyword: { select: { id: true, name: true } } },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Client profile error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
