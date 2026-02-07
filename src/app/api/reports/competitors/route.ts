import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { subDays, subMonths } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')
    const dateRange = searchParams.get('dateRange') || '30d'

    // Calculate date range
    const now = new Date()
    let startDate: Date
    switch (dateRange) {
      case '7d': startDate = subDays(now, 7); break
      case '30d': startDate = subDays(now, 30); break
      case '90d': startDate = subDays(now, 90); break
      case '12m': startDate = subMonths(now, 12); break
      default: startDate = subDays(now, 30)
    }

    const dateFilter = { gte: startDate, lte: now }

    // Get all stories for the period
    const [webStories, tvStories, radioStories, printStories] = await Promise.all([
      prisma.webStory.findMany({ where: { date: dateFilter }, select: { title: true, content: true, keywords: true, overallSentiment: true } }),
      prisma.tVStory.findMany({ where: { date: dateFilter }, select: { title: true, content: true, keywords: true, overallSentiment: true } }),
      prisma.radioStory.findMany({ where: { date: dateFilter }, select: { title: true, content: true, keywords: true, overallSentiment: true } }),
      prisma.printStory.findMany({ where: { date: dateFilter }, select: { title: true, content: true, keywords: true, overallSentiment: true } }),
    ])

    const allStories = [...webStories, ...tvStories, ...radioStories, ...printStories]
    const totalStories = allStories.length

    // Get clients with their competitors
    let clients = await prisma.client.findMany({
      where: { isActive: true },
      include: {
        keywords: { include: { keyword: true } },
        competitors: {
          include: { competitorClient: true },
          where: { isActive: true },
        },
        industries: { include: { industry: true } },
      },
    })

    // If specific client requested, filter to that client and its competitors
    if (clientId) {
      const targetClient = clients.find(c => c.id === clientId)
      if (targetClient) {
        const competitorIds = targetClient.competitors.map(c => c.competitorClientId).filter(Boolean)
        clients = clients.filter(c => c.id === clientId || competitorIds.includes(c.id))
      }
    }

    // Calculate mentions for each client
    const clientAnalysis = clients.map(client => {
      const clientKeywords = [
        client.name.toLowerCase(),
        ...(client.newsKeywords?.split(',').map(k => k.trim().toLowerCase()) || []),
        ...client.keywords.map(ck => ck.keyword.name.toLowerCase()),
      ].filter(Boolean)

      let mentions = 0
      let positiveCount = 0
      let neutralCount = 0
      let negativeCount = 0
      let totalSentiment = 0
      let totalReach = 0

      allStories.forEach(story => {
        const content = `${story.title} ${story.content || ''} ${story.keywords || ''}`.toLowerCase()
        const hasMatch = clientKeywords.some(kw => kw && content.includes(kw))
        if (hasMatch) {
          mentions++
          totalReach += 50000 // Estimated reach per mention
          if (story.overallSentiment === 'positive') positiveCount++
          else if (story.overallSentiment === 'neutral') neutralCount++
          else if (story.overallSentiment === 'negative') negativeCount++
          if (story.overallSentiment) totalSentiment++
        }
      })

      const sentiment = totalSentiment > 0 ? Math.round((positiveCount / totalSentiment) * 100) : 50
      const shareOfVoice = totalStories > 0 ? Math.round((mentions / totalStories) * 100) : 0

      return {
        id: client.id,
        name: client.name,
        mentions,
        sentiment,
        positiveCount,
        neutralCount,
        negativeCount,
        shareOfVoice,
        reach: totalReach,
        industries: client.industries.map(ci => ci.industry.name),
      }
    })
    .filter(c => c.mentions > 0)
    .sort((a, b) => b.mentions - a.mentions)

    // Format for share of voice chart
    const shareOfVoiceData = clientAnalysis.slice(0, 4).map((client, index) => ({
      name: client.name,
      value: client.shareOfVoice,
      color: ['#f97316', '#3b82f6', '#10b981', '#6b7280'][index] || '#6b7280',
    }))

    // Add "Others" if there are more clients
    const othersShare = clientAnalysis.slice(4).reduce((sum, c) => sum + c.shareOfVoice, 0)
    if (othersShare > 0) {
      shareOfVoiceData.push({ name: 'Others', value: othersShare, color: '#9ca3af' })
    }

    // Format for comparison chart
    const comparisonMetrics = ['Total Mentions', 'Positive Sentiment', 'Share of Voice']
    const competitorComparisonData = comparisonMetrics.map(metric => {
      const data: Record<string, string | number> = { metric }
      clientAnalysis.slice(0, 3).forEach((client, index) => {
        const key = index === 0 ? 'client' : `competitor${index}`
        switch (metric) {
          case 'Total Mentions':
            data[key] = client.mentions
            break
          case 'Positive Sentiment':
            data[key] = client.sentiment
            break
          case 'Share of Voice':
            data[key] = client.shareOfVoice
            break
        }
      })
      return data
    })

    // Format reach for display
    const formatReach = (reach: number) => {
      if (reach >= 1000000) return `${(reach / 1000000).toFixed(1)}M`
      if (reach >= 1000) return `${(reach / 1000).toFixed(0)}K`
      return reach.toString()
    }

    // Detailed client data
    const clientsDetailedData = clientAnalysis.map(c => ({
      ...c,
      reachFormatted: formatReach(c.reach),
    }))

    return NextResponse.json({
      shareOfVoiceData,
      competitorComparisonData,
      clientsDetailedData,
      totalStoriesAnalyzed: totalStories,
    })
  } catch (error) {
    console.error('Competitor analysis API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch competitor data' },
      { status: 500 }
    )
  }
}
