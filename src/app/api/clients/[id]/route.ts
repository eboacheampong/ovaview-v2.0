import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper to sync keywords from text to Keyword table
async function syncKeywords(keywordsText: string | null | undefined, clientId: string) {
  if (!keywordsText) return
  
  const keywordNames = keywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0)
  
  for (const name of keywordNames) {
    // Create keyword if it doesn't exist
    const keyword = await prisma.keyword.upsert({
      where: { name },
      create: { name },
      update: {},
    })
    
    // Link keyword to client
    await prisma.clientKeyword.upsert({
      where: { clientId_keywordId: { clientId, keywordId: keyword.id } },
      create: { clientId, keywordId: keyword.id },
      update: {},
    })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, name: true, email: true, isActive: true } },
        industries: { include: { industry: true } },
        keywords: { include: { keyword: true } },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Failed to fetch client:', error)
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name, email, phone, address, postalAddress, webAddress,
      contactPerson, logoUrl, expiryDate, isActive,
      newsEmailAlerts, newsSmsAlerts, newsKeywords, newsIndustryIds,
      tenderEmailAlerts, tenderSmsAlerts, tenderKeywords, tenderIndustryIds,
    } = body

    // Delete existing industry associations
    await prisma.clientIndustry.deleteMany({ where: { clientId: id } })

    const client = await prisma.client.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        address,
        postalAddress,
        webAddress,
        contactPerson,
        logoUrl,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isActive,
        newsEmailAlerts: newsEmailAlerts ?? false,
        newsSmsAlerts: newsSmsAlerts ?? false,
        newsKeywords,
        tenderEmailAlerts: tenderEmailAlerts ?? false,
        tenderSmsAlerts: tenderSmsAlerts ?? false,
        tenderKeywords,
        industries: {
          create: [...(newsIndustryIds || []), ...(tenderIndustryIds || [])]
            .filter((industryId: string, i: number, arr: string[]) => arr.indexOf(industryId) === i)
            .map((industryId: string) => ({ industryId })),
        },
      },
      include: {
        users: { select: { id: true } },
        industries: { include: { industry: true } },
        keywords: { include: { keyword: true } },
      },
    })

    // Sync keywords to the Keywords table
    await syncKeywords(newsKeywords, id)
    await syncKeywords(tenderKeywords, id)

    return NextResponse.json(client)
  } catch (error) {
    console.error('Failed to update client:', error)
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.client.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete client:', error)
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const client = await prisma.client.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error('Failed to patch client:', error)
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  }
}
