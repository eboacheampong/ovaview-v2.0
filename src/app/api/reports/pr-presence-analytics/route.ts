import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { subDays, subMonths, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')
    const dateRange = searchParams.get('dateRange') || '90d'
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    // Calculate date range
    const now = new Date()
    let startDate: Date
    let endDate: Date = now

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam)
      endDate = new Date(endDateParam)
    } else {
      switch (dateRange) {
        case '7d': startDate = subDays(now, 7); break
        case '30d': startDate = subDays(now, 30); break
        case '90d': startDate = subDays(now, 90); break
        case '12m': startDate = subMonths(now, 12); break
        default: startDate = subDays(now, 90)
      }
    }

    const dateFilter = { gte: startDate, lte: endDate }
    const dateRangeLabel = `${format(startDate, 'MMMM yyyy')} – ${format(endDate, 'MMMM yyyy')}`

    // Get client info
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        keywords: { include: { keyword: true } },
        competitors: {
          include: { competitorClient: { include: { keywords: { include: { keyword: true } } } } },
          where: { isActive: true },
        },
        industries: { include: { industry: true } },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const clientKeywords = [
      client.name.toLowerCase(),
      ...(client.newsKeywords?.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) || []),
      ...client.keywords.map(ck => ck.keyword.name.toLowerCase()),
    ].filter(Boolean)

    const industryId = client.industries?.[0]?.industryId

    // Build keyword search conditions for database query
    // This searches for ANY of the client keywords in title, content, keywords, or summary
    const keywordSearchConditions = clientKeywords.flatMap(kw => [
      { title: { contains: kw, mode: 'insensitive' as const } },
      { content: { contains: kw, mode: 'insensitive' as const } },
      { keywords: { contains: kw, mode: 'insensitive' as const } },
      { summary: { contains: kw, mode: 'insensitive' as const } },
    ])

    // Build filter that matches EITHER keywords OR industry
    // This ensures we don't miss stories that mention the client but are in a different industry
    const buildStoryFilter = () => {
      const conditions: object[] = []
      
      if (keywordSearchConditions.length > 0) {
        conditions.push({ OR: keywordSearchConditions })
      }
      
      if (industryId) {
        conditions.push({ industryId })
      }
      
      if (conditions.length === 0) {
        return { date: dateFilter }
      }
      
      return {
        date: dateFilter,
        OR: conditions,
      }
    }

    const storyFilter = buildStoryFilter()

    // Fetch ALL stories that match either keywords OR industry
    const [allWebStories, allTvStories, allRadioStories, allPrintStories] = await Promise.all([
      prisma.webStory.findMany({
        where: storyFilter,
        include: { publication: true, industry: true },
      }),
      prisma.tVStory.findMany({
        where: storyFilter,
        include: { station: true, industry: true },
      }),
      prisma.radioStory.findMany({
        where: storyFilter,
        include: { station: true, industry: true },
      }),
      prisma.printStory.findMany({
        where: storyFilter,
        include: { publication: true, industry: true },
      }),
    ])

    const allIndustryStories = [...allWebStories, ...allTvStories, ...allRadioStories, ...allPrintStories]

    // ===== SCOPE OF COVERAGE =====
    const uniqueWebPublications = new Set(allWebStories.map(s => s.publicationId).filter(Boolean))
    const uniquePrintPublications = new Set(allPrintStories.map(s => s.publicationId).filter(Boolean))
    const uniqueRadioStations = new Set(allRadioStories.map(s => s.stationId).filter(Boolean))
    const uniqueTvStations = new Set(allTvStories.map(s => s.stationId).filter(Boolean))

    // Get publication/station names for scope descriptions
    const webPubNames = Array.from(new Set(allWebStories.map(s => s.publication?.name).filter(Boolean))).slice(0, 6)
    const printPubNames = Array.from(new Set(allPrintStories.map(s => s.publication?.name).filter(Boolean))).slice(0, 6)
    const radioStationNames = Array.from(new Set(allRadioStories.map(s => s.station?.name).filter(Boolean))).slice(0, 6)
    const tvStationNames = Array.from(new Set(allTvStories.map(s => s.station?.name).filter(Boolean))).slice(0, 6)

    const scopeOfCoverage = {
      newsWebsite: { count: uniqueWebPublications.size, names: webPubNames, description: `Monitoring covered over ${uniqueWebPublications.size} major news websites locally and internationally` },
      printMedia: { count: uniquePrintPublications.size, names: printPubNames, description: `Covered all newspapers including major papers such as ${printPubNames.slice(0, 3).join(', ')}` },
      radio: { count: uniqueRadioStations.size, names: radioStationNames, description: `Radio stations covered include ${radioStationNames.slice(0, 4).join(', ')}` },
      television: { count: uniqueTvStations.size, names: tvStationNames, description: `TV stations covered include ${tvStationNames.slice(0, 4).join(', ')}` },
    }

    // ===== MEDIA SOURCES - INDUSTRY =====
    const totalIndustryStories = allIndustryStories.length
    const mediaSourcesIndustry = {
      newsWebsite: { count: allWebStories.length, percentage: totalIndustryStories > 0 ? Math.round((allWebStories.length / totalIndustryStories) * 1000) / 10 : 0 },
      printMedia: { count: allPrintStories.length, percentage: totalIndustryStories > 0 ? Math.round((allPrintStories.length / totalIndustryStories) * 1000) / 10 : 0 },
      radio: { count: allRadioStories.length, percentage: totalIndustryStories > 0 ? Math.round((allRadioStories.length / totalIndustryStories) * 1000) / 10 : 0 },
      tv: { count: allTvStories.length, percentage: totalIndustryStories > 0 ? Math.round((allTvStories.length / totalIndustryStories) * 1000) / 10 : 0 },
      total: totalIndustryStories,
    }

    // ===== MEDIA SOURCES - MONTHLY TREND =====
    const monthlyTrendMap = new Map<string, { print: number; web: number; tv: number; radio: number }>()
    
    // Initialize months in the range
    let currentMonth = new Date(startDate)
    while (currentMonth <= endDate) {
      const monthKey = format(currentMonth, 'MMMM')
      monthlyTrendMap.set(monthKey, { print: 0, web: 0, tv: 0, radio: 0 })
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    }

    allWebStories.forEach(s => { const k = format(new Date(s.date), 'MMMM'); const e = monthlyTrendMap.get(k); if (e) e.web++ })
    allPrintStories.forEach(s => { const k = format(new Date(s.date), 'MMMM'); const e = monthlyTrendMap.get(k); if (e) e.print++ })
    allTvStories.forEach(s => { const k = format(new Date(s.date), 'MMMM'); const e = monthlyTrendMap.get(k); if (e) e.tv++ })
    allRadioStories.forEach(s => { const k = format(new Date(s.date), 'MMMM'); const e = monthlyTrendMap.get(k); if (e) e.radio++ })

    const monthlyTrend = Array.from(monthlyTrendMap.entries()).map(([month, data]) => ({
      month,
      ...data,
      total: data.print + data.web + data.tv + data.radio,
    }))

    // ===== THEMATIC AREAS / KEYWORD CLOUD =====
    const keywordCounts = new Map<string, number>()
    allIndustryStories.forEach(s => {
      if (s.keywords) {
        s.keywords.split(',').forEach(k => {
          const keyword = k.trim()
          if (keyword && keyword.length > 2) {
            keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1)
          }
        })
      }
    })

    const thematicAreas = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([keyword, count]) => ({ keyword, count, weight: 0 }))

    // Calculate relative weights for word cloud sizing
    if (thematicAreas.length > 0) {
      const maxCount = thematicAreas[0].count
      const minCount = thematicAreas[thematicAreas.length - 1].count
      thematicAreas.forEach(t => {
        t.weight = maxCount === minCount ? 50 : Math.round(((t.count - minCount) / (maxCount - minCount)) * 100)
      })
    }

    // ===== KEY PERSONALITIES - INDUSTRY (from story content mentions) =====
    // We'll extract from author fields and content analysis
    const personalityCounts = new Map<string, { name: string; count: number; title: string }>()
    
    // Count authors as key personalities
    const allAuthors = [
      ...allWebStories.filter(s => s.author).map(s => ({ author: s.author!, outlet: s.publication?.name || '' })),
      ...allPrintStories.filter(s => s.author).map(s => ({ author: s.author!, outlet: s.publication?.name || '' })),
    ]

    // ===== KEY JOURNALISTS - TOP 5 =====
    const journalistCounts = new Map<string, { name: string; count: number; outlet: string }>()
    allAuthors.forEach(({ author, outlet }) => {
      const key = author.toLowerCase().trim()
      if (key.length > 3) {
        const existing = journalistCounts.get(key)
        if (existing) {
          existing.count++
        } else {
          journalistCounts.set(key, { name: author.trim(), count: 1, outlet })
        }
      }
    })

    const topJournalists = Array.from(journalistCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // ===== CLIENT VISIBILITY =====
    const matchesClient = (story: { title: string; content: string | null; keywords: string | null }) => {
      const content = `${story.title} ${story.content || ''} ${story.keywords || ''}`.toLowerCase()
      return clientKeywords.some(kw => content.includes(kw))
    }

    const clientWebStories = allWebStories.filter(matchesClient)
    const clientPrintStories = allPrintStories.filter(matchesClient)
    const clientTvStories = allTvStories.filter(matchesClient)
    const clientRadioStories = allRadioStories.filter(matchesClient)
    const clientStories = [...clientWebStories, ...clientPrintStories, ...clientTvStories, ...clientRadioStories]
    const totalClientMentions = clientStories.length

    // Client sources of mentions
    const clientSourcesOfMentions = {
      printMedia: clientPrintStories.length,
      newsWebsite: clientWebStories.length,
      tv: clientTvStories.length,
      radio: clientRadioStories.length,
    }

    // Client trend of mentions by month
    const clientMonthlyTrend = Array.from(monthlyTrendMap.keys()).map(month => {
      const monthStories = clientStories.filter(s => format(new Date(s.date), 'MMMM') === month)
      return { month, count: monthStories.length }
    })

    // ===== INDUSTRY ORGANIZATIONS VISIBILITY (donut chart) =====
    // Get all clients in the same industry to show org visibility
    const industryClients = await prisma.client.findMany({
      where: { isActive: true, industries: industryId ? { some: { industryId } } : undefined },
      include: { keywords: { include: { keyword: true } } },
    })

    const orgVisibility = industryClients.map(orgClient => {
      const orgKeywords = [
        orgClient.name.toLowerCase(),
        ...(orgClient.newsKeywords?.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) || []),
        ...orgClient.keywords.map(ck => ck.keyword.name.toLowerCase()),
      ].filter(Boolean)

      const mentions = allIndustryStories.filter(story => {
        const content = `${story.title} ${story.content || ''} ${story.keywords || ''}`.toLowerCase()
        return orgKeywords.some(kw => content.includes(kw))
      }).length

      return { name: orgClient.name, id: orgClient.id, mentions }
    })
    .filter(o => o.mentions > 0)
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 5)

    // ===== MAJOR STORIES - CLIENT =====
    const clientMajorStories = clientStories
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 6)
      .map(s => ({
        date: format(new Date(s.date), 'MMMM d, yyyy'),
        title: s.title,
        summary: ('summary' in s && s.summary) ? s.summary as string : (s.content ? s.content.substring(0, 300) + '...' : ''),
      }))

    // ===== COMPETITOR PRESENCE - TOP 5 SECTOR PLAYERS =====
    const competitors = client.competitors || []
    const competitorAnalysis: Array<{ name: string; mentions: number; percentage: number; majorStories: Array<{ date: string; title: string; summary: string }> }> = []

    // Include the client's own competitors
    for (const comp of competitors) {
      const compClient = comp.competitorClient
      if (!compClient) {
        // External competitor with keywords
        if (comp.competitorName && comp.competitorKeywords) {
          const compKeywords = comp.competitorKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
          if (comp.competitorName) compKeywords.push(comp.competitorName.toLowerCase())
          
          const compStories = allIndustryStories.filter(story => {
            const content = `${story.title} ${story.content || ''} ${story.keywords || ''}`.toLowerCase()
            return compKeywords.some(kw => content.includes(kw))
          })

          const compMajorStories = compStories
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 6)
            .map(s => ({
              date: format(new Date(s.date), 'MMMM d, yyyy'),
              title: s.title,
              summary: ('summary' in s && s.summary) ? s.summary as string : (s.content ? s.content.substring(0, 300) + '...' : ''),
            }))

          competitorAnalysis.push({
            name: comp.competitorName,
            mentions: compStories.length,
            percentage: 0,
            majorStories: compMajorStories,
          })
        }
        continue
      }

      const compKeywords = [
        compClient.name.toLowerCase(),
        ...(compClient.newsKeywords?.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) || []),
        ...(compClient.keywords?.map(ck => ck.keyword.name.toLowerCase()) || []),
      ].filter(Boolean)

      const compStories = allIndustryStories.filter(story => {
        const content = `${story.title} ${story.content || ''} ${story.keywords || ''}`.toLowerCase()
        return compKeywords.some(kw => content.includes(kw))
      })

      const compMajorStories = compStories
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 6)
        .map(s => ({
          date: format(new Date(s.date), 'MMMM d, yyyy'),
          title: s.title,
          summary: ('summary' in s && s.summary) ? s.summary as string : (s.content ? s.content.substring(0, 300) + '...' : ''),
        }))

      competitorAnalysis.push({
        name: compClient.name,
        mentions: compStories.length,
        percentage: 0,
        majorStories: compMajorStories,
      })
    }

    // Calculate percentages for competitor pie chart
    const totalCompetitorMentions = competitorAnalysis.reduce((sum, c) => sum + c.mentions, 0)
    competitorAnalysis.forEach(c => {
      c.percentage = totalCompetitorMentions > 0 ? Math.round((c.mentions / totalCompetitorMentions) * 1000) / 10 : 0
    })
    competitorAnalysis.sort((a, b) => b.mentions - a.mentions)

    // ===== SENTIMENT ANALYSIS =====
    const industrySentiment = {
      positive: { count: allIndustryStories.filter(s => s.overallSentiment === 'positive').length, percentage: 0 },
      negative: { count: allIndustryStories.filter(s => s.overallSentiment === 'negative').length, percentage: 0 },
      neutral: { count: allIndustryStories.filter(s => s.overallSentiment === 'neutral').length, percentage: 0 },
    }
    const totalWithSentiment = industrySentiment.positive.count + industrySentiment.negative.count + industrySentiment.neutral.count
    if (totalWithSentiment > 0) {
      industrySentiment.positive.percentage = Math.round((industrySentiment.positive.count / totalWithSentiment) * 1000) / 10
      industrySentiment.negative.percentage = Math.round((industrySentiment.negative.count / totalWithSentiment) * 1000) / 10
      industrySentiment.neutral.percentage = Math.round((industrySentiment.neutral.count / totalWithSentiment) * 1000) / 10
    }

    // Client-specific sentiment
    const clientSentiment = {
      positive: clientStories.filter(s => s.overallSentiment === 'positive').length,
      negative: clientStories.filter(s => s.overallSentiment === 'negative').length,
      neutral: clientStories.filter(s => s.overallSentiment === 'neutral').length,
    }

    // ===== KEY TAKEOUTS / CONCLUSIONS =====
    const industryName = client.industries?.[0]?.industry?.name || 'the industry'
    const highestMonth = monthlyTrend.reduce((max, m) => m.total > max.total ? m : max, monthlyTrend[0])
    const lowestMonth = monthlyTrend.reduce((min, m) => m.total < min.total ? m : min, monthlyTrend[0])

    const keyTakeouts = [
      `In the review period, ${totalIndustryStories.toLocaleString()} news stories about ${industryName} were reported, with ${mediaSourcesIndustry.printMedia.percentage}% coming from print media.`,
      `${client.name} featured in ${totalClientMentions} news stories during the review period of the total ${industryName} coverage.`,
      `Overall, ${industrySentiment.positive.percentage}% of the ${industryName} sector's publicity remains positive.`,
      `${clientSentiment.positive} positive stories were reported on ${client.name} during the review period.`,
    ]

    return NextResponse.json({
      clientName: client.name,
      clientLogo: client.logoUrl,
      industryName,
      dateRangeLabel,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      scopeOfCoverage,
      mediaSourcesIndustry,
      monthlyTrend,
      thematicAreas,
      topJournalists,
      totalClientMentions,
      clientSourcesOfMentions,
      clientMonthlyTrend,
      orgVisibility,
      clientMajorStories,
      competitorAnalysis,
      industrySentiment,
      clientSentiment,
      keyTakeouts,
      totalIndustryStories,
    })
  } catch (error) {
    console.error('PR Presence Analytics API error:', error)
    return NextResponse.json({ error: 'Failed to fetch PR presence analytics' }, { status: 500 })
  }
}
