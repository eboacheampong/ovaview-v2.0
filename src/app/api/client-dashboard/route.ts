import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDailyReach } from '@/lib/reach-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const days = parseInt(searchParams.get('days') || '30', 10)

  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  }

  try {
    const since = new Date()
    since.setDate(since.getDate() - days)

    // Get client info with industries
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true, name: true, logoUrl: true, newsKeywords: true,
        industries: { include: { industry: { select: { id: true } } } },
      },
    })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const industryIds = client.industries.map(ci => ci.industry.id)

    // Fetch all media mentions in parallel
    const [webStories, tvStories, radioStories, printStories, socialPosts] = await Promise.all([
      prisma.webStory.findMany({
        where: { industryId: { in: industryIds }, date: { gte: since } },
        orderBy: { date: 'desc' },
        select: {
          id: true, title: true, sourceUrl: true, author: true, date: true,
          summary: true, overallSentiment: true, keywords: true, keyPersonalities: true,
          publication: { select: { name: true, website: true, reach: true } },
        },
      }),
      prisma.tVStory.findMany({
        where: { industryId: { in: industryIds }, date: { gte: since } },
        orderBy: { date: 'desc' },
        select: {
          id: true, title: true, presenters: true, date: true,
          summary: true, overallSentiment: true, keywords: true, keyPersonalities: true,
          station: { select: { name: true, reach: true } },
        },
      }),
      prisma.radioStory.findMany({
        where: { industryId: { in: industryIds }, date: { gte: since } },
        orderBy: { date: 'desc' },
        select: {
          id: true, title: true, presenters: true, date: true,
          summary: true, overallSentiment: true, keywords: true, keyPersonalities: true,
          station: { select: { name: true, reach: true } },
        },
      }),
      prisma.printStory.findMany({
        where: { industryId: { in: industryIds }, date: { gte: since } },
        orderBy: { date: 'desc' },
        select: {
          id: true, title: true, author: true, date: true,
          summary: true, overallSentiment: true, keywords: true, keyPersonalities: true,
          publication: { select: { name: true, reach: true } },
        },
      }),
      prisma.socialPost.findMany({
        where: { clientId, status: 'accepted', postedAt: { gte: since } },
        orderBy: { postedAt: 'desc' },
        select: {
          id: true, platform: true, content: true, authorName: true,
          authorHandle: true, authorAvatarUrl: true, postUrl: true,
          likesCount: true, commentsCount: true, sharesCount: true,
          viewsCount: true, overallSentiment: true, postedAt: true, keywords: true,
        },
      }),
    ])

    // Normalize all mentions into a unified feed
    type Mention = {
      id: string; type: string; title: string; source: string;
      sourceUrl?: string; author: string; date: string;
      summary: string; sentiment: string; reach: number;
      platform?: string; engagement?: number;
      keywords?: string; keyPersonalities?: string;
    }

    const mentions: Mention[] = []

    for (const s of webStories) {
      mentions.push({
        id: s.id, type: 'web', title: s.title,
        source: s.publication?.name || 'Web', sourceUrl: s.sourceUrl || undefined,
        author: s.author || '', date: s.date.toISOString(),
        summary: s.summary || '', sentiment: s.overallSentiment || 'neutral',
        reach: calculateDailyReach(s.publication?.reach || 0, s.date),
        keywords: s.keywords || undefined, keyPersonalities: s.keyPersonalities || undefined,
      })
    }
    for (const s of tvStories) {
      mentions.push({
        id: s.id, type: 'tv', title: s.title,
        source: s.station?.name || 'TV', author: s.presenters || '',
        date: s.date.toISOString(), summary: s.summary || '',
        sentiment: s.overallSentiment || 'neutral', reach: calculateDailyReach(s.station?.reach || 0, s.date),
        keywords: s.keywords || undefined, keyPersonalities: s.keyPersonalities || undefined,
      })
    }
    for (const s of radioStories) {
      mentions.push({
        id: s.id, type: 'radio', title: s.title,
        source: s.station?.name || 'Radio', author: s.presenters || '',
        date: s.date.toISOString(), summary: s.summary || '',
        sentiment: s.overallSentiment || 'neutral', reach: calculateDailyReach(s.station?.reach || 0, s.date),
        keywords: s.keywords || undefined, keyPersonalities: s.keyPersonalities || undefined,
      })
    }
    for (const s of printStories) {
      mentions.push({
        id: s.id, type: 'print', title: s.title,
        source: s.publication?.name || 'Print', author: s.author || '',
        date: s.date.toISOString(), summary: s.summary || '',
        sentiment: s.overallSentiment || 'neutral', reach: calculateDailyReach(s.publication?.reach || 0, s.date),
        keywords: s.keywords || undefined, keyPersonalities: s.keyPersonalities || undefined,
      })
    }
    for (const s of socialPosts) {
      const eng = (s.likesCount || 0) + (s.commentsCount || 0) + (s.sharesCount || 0)
      mentions.push({
        id: s.id, type: 'social', title: s.content?.substring(0, 100) || 'Social post',
        source: s.platform, sourceUrl: s.postUrl || undefined,
        author: s.authorName || s.authorHandle || '',
        date: s.postedAt.toISOString(), summary: s.content || '',
        sentiment: s.overallSentiment || 'neutral',
        reach: s.viewsCount || 0, platform: s.platform, engagement: eng,
        keywords: s.keywords || undefined,
      })
    }

    // Sort by date descending
    mentions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Summary stats
    const totalMentions = mentions.length
    const positive = mentions.filter(m => m.sentiment === 'positive').length
    const negative = mentions.filter(m => m.sentiment === 'negative').length
    const neutral = totalMentions - positive - negative
    const totalReach = mentions.reduce((s, m) => s + m.reach, 0)
    const totalInteractions = socialPosts.reduce((s, p) =>
      s + (p.likesCount || 0) + (p.commentsCount || 0) + (p.sharesCount || 0), 0)

    // Source breakdown
    const sourceCounts: Record<string, number> = {}
    mentions.forEach(m => {
      const key = m.type === 'social' ? m.platform || 'Social' : m.type.charAt(0).toUpperCase() + m.type.slice(1)
      sourceCounts[key] = (sourceCounts[key] || 0) + 1
    })

    // Daily chart data
    const dailyMap: Record<string, { mentions: number; reach: number }> = {}
    mentions.forEach(m => {
      const day = m.date.slice(0, 10)
      if (!dailyMap[day]) dailyMap[day] = { mentions: 0, reach: 0 }
      dailyMap[day].mentions++
      dailyMap[day].reach += m.reach
    })

    const chart: { date: string; mentions: number; reach: number }[] = []
    const cursor = new Date(since)
    const now = new Date()
    while (cursor <= now) {
      const key = cursor.toISOString().slice(0, 10)
      chart.push({ date: key, mentions: dailyMap[key]?.mentions || 0, reach: dailyMap[key]?.reach || 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    return NextResponse.json({
      client: { name: client.name, logoUrl: client.logoUrl },
      summary: { totalMentions, positive, negative, neutral, totalReach, totalInteractions },
      sourceCounts,
      chart,
      mentions,
    })
  } catch (error) {
    console.error('[Client Dashboard] Error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
