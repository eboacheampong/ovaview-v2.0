import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Helper to sync keywords from text to Keyword table
// This REPLACES all existing keyword links with the new ones
async function syncKeywords(keywordsText: string | null | undefined, clientId: string) {
  // First, delete ALL existing keyword links for this client
  await prisma.clientKeyword.deleteMany({ where: { clientId } })

  // If no keywords provided, we're done (but still clean up orphans)
  if (!keywordsText) {
    await cleanupOrphanedKeywords()
    return
  }
  
  const keywordNames = keywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0)
  
  for (const name of keywordNames) {
    // Create keyword if it doesn't exist
    const keyword = await prisma.keyword.upsert({
      where: { name },
      create: { name },
      update: {},
    })
    
    // Link keyword to client
    await prisma.clientKeyword.create({
      data: { clientId, keywordId: keyword.id },
    })
  }

  // Clean up any keywords that are no longer linked to any client
  await cleanupOrphanedKeywords()
}

// Delete keywords that have no client links
async function cleanupOrphanedKeywords() {
  await prisma.keyword.deleteMany({
    where: {
      clients: { none: {} }
    }
  })
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
      newsEmailAlerts, newsSmsAlerts, newsKeywords, newsIndustryId, newsSubIndustryIds,
      tenderEmailAlerts, tenderSmsAlerts, tenderKeywords, tenderIndustryIds,
    } = body

    // Delete existing industry associations
    await prisma.clientIndustry.deleteMany({ where: { clientId: id } })

    // Collect all industry IDs to link
    const industryIdsToLink = new Set<string>()

    // Add the main news industry if selected
    if (newsIndustryId) {
      industryIdsToLink.add(newsIndustryId)
    }

    // Add parent industries from selected sub-industries
    const allSubIndustryIds = [...(newsSubIndustryIds || [])]
      .filter((sid, i, arr) => arr.indexOf(sid) === i)

    if (allSubIndustryIds.length > 0) {
      const subIndustries = await prisma.subIndustry.findMany({
        where: { id: { in: allSubIndustryIds } },
        select: { industryId: true },
      })
      subIndustries.forEach(s => industryIdsToLink.add(s.industryId))
    }

    // Add tender industries directly (they are main industry IDs)
    if (tenderIndustryIds) {
      tenderIndustryIds.forEach((tid: string) => industryIdsToLink.add(tid))
    }

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
          create: Array.from(industryIdsToLink).map((industryId: string) => ({ industryId })),
        },
      },
      include: {
        users: { select: { id: true } },
        industries: { include: { industry: true } },
        keywords: { include: { keyword: true } },
      },
    })

    // Sync keywords to the Keywords table (combines news + tender keywords)
    // This replaces ALL existing keyword links with the current ones
    const allKeywordsText = [newsKeywords, tenderKeywords].filter(Boolean).join(', ')
    await syncKeywords(allKeywordsText, id)

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
