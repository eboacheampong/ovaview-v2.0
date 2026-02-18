import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        users: { select: { id: true } },
        industries: { include: { industry: true } },
        keywords: { include: { keyword: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Failed to fetch clients:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name, email, phone, address, postalAddress, webAddress,
      contactPerson, logoUrl, expiryDate, isActive,
      newsEmailAlerts, newsSmsAlerts, newsKeywords, newsIndustryId, newsSubIndustryIds,
      tenderEmailAlerts, tenderSmsAlerts, tenderKeywords, tenderIndustryIds,
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 })
    }

    // Collect all industry IDs to link
    const industryIdsToLink = new Set<string>()

    // Add the main news industry if selected (even without sub-industries)
    if (newsIndustryId) {
      industryIdsToLink.add(newsIndustryId)
    }

    // Add parent industries from selected sub-industries
    const allSubIndustryIds = [...(newsSubIndustryIds || []), ...(tenderIndustryIds || [])]
      .filter((id, i, arr) => arr.indexOf(id) === i)

    if (allSubIndustryIds.length > 0) {
      const subIndustries = await prisma.subIndustry.findMany({
        where: { id: { in: allSubIndustryIds } },
        select: { industryId: true },
      })
      subIndustries.forEach(s => industryIdsToLink.add(s.industryId))
    }

    // Add tender industries directly (they are main industry IDs)
    if (tenderIndustryIds) {
      tenderIndustryIds.forEach((id: string) => industryIdsToLink.add(id))
    }

    const client = await prisma.client.create({
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
        isActive: isActive ?? true,
        newsEmailAlerts: newsEmailAlerts ?? false,
        newsSmsAlerts: newsSmsAlerts ?? false,
        newsKeywords,
        tenderEmailAlerts: tenderEmailAlerts ?? false,
        tenderSmsAlerts: tenderSmsAlerts ?? false,
        tenderKeywords,
        industries: {
          create: Array.from(industryIdsToLink).map((industryId: string) => ({ industryId })),
        },
      },
      include: {
        users: { select: { id: true } },
        industries: { include: { industry: true } },
        keywords: { include: { keyword: true } },
      },
    })

    // Sync keywords to the Keywords table
    await syncKeywords(newsKeywords, client.id)
    await syncKeywords(tenderKeywords, client.id)

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Failed to create client:', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}
