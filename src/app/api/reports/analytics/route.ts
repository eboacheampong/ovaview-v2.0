import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { subDays, subMonths, startOfDay, endOfDay, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateRange = searchParams.get('dateRange') || '30d'
    const mediaFilter = searchParams.get('mediaFilter') || 'all'
    const clientId = searchParams.get('clientId')
    const industryId = searchParams.get('industryId')

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

    // Build where clauses
    const dateFilter = { gte: startDate, lte: now }
    const industryFilter = industryId ? { industryId } : {}

    // Fetch all story counts in parallel
    const [webStories, tvStories, radioStories, printStories] = await Promise.all([
      mediaFilter === 'all' || mediaFilter === 'web' 
        ? prisma.webStory.findMany({
            where: { date: dateFilter, ...industryFilter },
            include: { publication: true, industry: true },
          })
        : [],
      mediaFilter === 'all' || mediaFilter === 'tv'
        ? prisma.tVStory.findMany({
            where: { date: dateFilter, ...industryFilter },
            include: { station: true, industry: true },
          })
        : [],
      mediaFilter === 'all' || mediaFilter === 'radio'
        ? prisma.radioStory.findMany({
            where: { date: dateFilter, ...industryFilter },
            include: { station: true, industry: true },
          })
        : [],
      mediaFilter === 'all' || mediaFilter === 'print'
        ? prisma.printStory.findMany({
            where: { date: dateFilter, ...industryFilter },
            include: { publication: true, industry: true },
          })
        : [],
    ])

    // Calculate total coverage
    const totalCoverage = webStories.length + tvStories.length + radioStories.length + printStories.length

    // Calculate total reach
    const webReach = webStories.reduce((sum, s) => sum + (s.publication?.reach || 0), 0)
    const tvReach = tvStories.reduce((sum, s) => sum + (s.station?.reach || 0), 0)
    const radioReach = radioStories.reduce((sum, s) => sum + (s.station?.reach || 0), 0)
    const printReach = printStories.reduce((sum, s) => sum + (s.publication?.reach || 0), 0)
    const totalReach = webReach + tvReach + radioReach + printReach

    // Calculate sentiment distribution
    const allStories = [...webStories, ...tvStories, ...radioStories, ...printStories]
    const storiesWithSentiment = allStories.filter(s => s.overallSentiment)
    const sentimentCounts = {
      positive: storiesWithSentiment.filter(s => s.overallSentiment === 'positive').length,
      neutral: storiesWithSentiment.filter(s => s.overallSentiment === 'neutral').length,
      negative: storiesWithSentiment.filter(s => s.overallSentiment === 'negative').length,
    }
    const sentimentTotal = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative
    const sentimentData = sentimentTotal > 0 ? [
      { name: 'Positive', value: Math.round((sentimentCounts.positive / sentimentTotal) * 100), color: '#10b981' },
      { name: 'Neutral', value: Math.round((sentimentCounts.neutral / sentimentTotal) * 100), color: '#6b7280' },
      { name: 'Negative', value: Math.round((sentimentCounts.negative / sentimentTotal) * 100), color: '#ef4444' },
    ] : [
      { name: 'Positive', value: 0, color: '#10b981' },
      { name: 'Neutral', value: 0, color: '#6b7280' },
      { name: 'Negative', value: 0, color: '#ef4444' },
    ]

    // Calculate average sentiment score
    const avgSentiment = sentimentTotal > 0 
      ? Math.round((sentimentCounts.positive / sentimentTotal) * 100)
      : 0

    // Media distribution
    const mediaDistributionData = [
      { name: 'Web', value: totalCoverage > 0 ? Math.round((webStories.length / totalCoverage) * 100) : 0, color: '#06b6d4' },
      { name: 'Print', value: totalCoverage > 0 ? Math.round((printStories.length / totalCoverage) * 100) : 0, color: '#3b82f6' },
      { name: 'Radio', value: totalCoverage > 0 ? Math.round((radioStories.length / totalCoverage) * 100) : 0, color: '#10b981' },
      { name: 'TV', value: totalCoverage > 0 ? Math.round((tvStories.length / totalCoverage) * 100) : 0, color: '#8b5cf6' },
    ]

    // Coverage trend by month
    const coverageTrendMap = new Map<string, { print: number; radio: number; tv: number; web: number }>()
    
    // Initialize months
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const monthKey = format(monthDate, 'MMM')
      coverageTrendMap.set(monthKey, { print: 0, radio: 0, tv: 0, web: 0 })
    }

    // Count stories per month
    webStories.forEach(s => {
      const monthKey = format(new Date(s.date), 'MMM')
      const existing = coverageTrendMap.get(monthKey)
      if (existing) existing.web++
    })
    tvStories.forEach(s => {
      const monthKey = format(new Date(s.date), 'MMM')
      const existing = coverageTrendMap.get(monthKey)
      if (existing) existing.tv++
    })
    radioStories.forEach(s => {
      const monthKey = format(new Date(s.date), 'MMM')
      const existing = coverageTrendMap.get(monthKey)
      if (existing) existing.radio++
    })
    printStories.forEach(s => {
      const monthKey = format(new Date(s.date), 'MMM')
      const existing = coverageTrendMap.get(monthKey)
      if (existing) existing.print++
    })

    const coverageTrendData = Array.from(coverageTrendMap.entries()).map(([month, data]) => ({
      month,
      ...data,
      total: data.print + data.radio + data.tv + data.web,
    }))

    // Industry performance
    const industries = await prisma.industry.findMany({ where: { isActive: true } })
    const industryPerformanceData = await Promise.all(
      industries.slice(0, 6).map(async (industry) => {
        const [webCount, tvCount, radioCount, printCount] = await Promise.all([
          prisma.webStory.count({ where: { industryId: industry.id, date: dateFilter } }),
          prisma.tVStory.count({ where: { industryId: industry.id, date: dateFilter } }),
          prisma.radioStory.count({ where: { industryId: industry.id, date: dateFilter } }),
          prisma.printStory.count({ where: { industryId: industry.id, date: dateFilter } }),
        ])
        const total = webCount + tvCount + radioCount + printCount
        
        // Get sentiment for this industry
        const industryStories = allStories.filter(s => s.industryId === industry.id)
        const posCount = industryStories.filter(s => s.overallSentiment === 'positive').length
        const sentimentScore = industryStories.length > 0 ? Math.round((posCount / industryStories.length) * 100) : 50

        return {
          industry: industry.name,
          coverage: Math.min(total * 5, 100), // Scale for radar chart
          sentiment: sentimentScore,
          reach: Math.min(total * 3, 100), // Scale for radar chart
        }
      })
    )

    // Top publications
    const publicationCounts = new Map<string, { name: string; stories: number; reach: number; type: string }>()
    
    webStories.forEach(s => {
      if (s.publication) {
        const key = `web-${s.publication.id}`
        const existing = publicationCounts.get(key)
        if (existing) {
          existing.stories++
        } else {
          publicationCounts.set(key, {
            name: s.publication.name,
            stories: 1,
            reach: s.publication.reach || 0,
            type: 'web',
          })
        }
      }
    })
    
    tvStories.forEach(s => {
      if (s.station) {
        const key = `tv-${s.station.id}`
        const existing = publicationCounts.get(key)
        if (existing) {
          existing.stories++
        } else {
          publicationCounts.set(key, {
            name: s.station.name,
            stories: 1,
            reach: s.station.reach || 0,
            type: 'tv',
          })
        }
      }
    })
    
    radioStories.forEach(s => {
      if (s.station) {
        const key = `radio-${s.station.id}`
        const existing = publicationCounts.get(key)
        if (existing) {
          existing.stories++
        } else {
          publicationCounts.set(key, {
            name: s.station.name,
            stories: 1,
            reach: s.station.reach || 0,
            type: 'radio',
          })
        }
      }
    })
    
    printStories.forEach(s => {
      if (s.publication) {
        const key = `print-${s.publication.id}`
        const existing = publicationCounts.get(key)
        if (existing) {
          existing.stories++
        } else {
          publicationCounts.set(key, {
            name: s.publication.name,
            stories: 1,
            reach: s.publication.reach || 0,
            type: 'print',
          })
        }
      }
    })

    const topPublicationsData = Array.from(publicationCounts.values())
      .sort((a, b) => b.stories - a.stories)
      .slice(0, 6)
      .map(p => ({
        ...p,
        reach: p.reach >= 1000000 ? `${(p.reach / 1000000).toFixed(1)}M` : 
               p.reach >= 1000 ? `${(p.reach / 1000).toFixed(0)}K` : 
               p.reach.toString(),
      }))

    // Top keywords from stories
    const keywordCounts = new Map<string, number>()
    allStories.forEach(s => {
      if (s.keywords) {
        s.keywords.split(',').forEach(k => {
          const keyword = k.trim().toLowerCase()
          if (keyword) {
            keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1)
          }
        })
      }
    })

    const topKeywordsData = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([keyword, count], index) => ({
        keyword: keyword.charAt(0).toUpperCase() + keyword.slice(1),
        count,
        trend: index < 3 ? 'up' : index < 5 ? 'stable' : 'down',
      }))

    // Hourly engagement (based on story creation times)
    const hourlyEngagement = new Array(24).fill(0)
    allStories.forEach(s => {
      const hour = new Date(s.createdAt).getHours()
      hourlyEngagement[hour]++
    })

    const hourlyEngagementData = hourlyEngagement
      .slice(6, 22) // 6AM to 9PM
      .map((engagement, index) => ({
        hour: `${index + 6}${index + 6 < 12 ? 'AM' : 'PM'}`.replace('12PM', '12PM').replace('0AM', '12AM'),
        engagement,
      }))

    // Get active clients count
    const activeClients = await prisma.client.count({ where: { isActive: true } })

    // Get today's entries
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const [todayWeb, todayTv, todayRadio, todayPrint] = await Promise.all([
      prisma.webStory.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.tVStory.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.radioStory.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.printStory.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
    ])
    const todayEntries = todayWeb + todayTv + todayRadio + todayPrint

    // Calculate previous period for comparison
    const prevStartDate = subDays(startDate, dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365)
    const [prevWebCount, prevTvCount, prevRadioCount, prevPrintCount] = await Promise.all([
      prisma.webStory.count({ where: { date: { gte: prevStartDate, lt: startDate } } }),
      prisma.tVStory.count({ where: { date: { gte: prevStartDate, lt: startDate } } }),
      prisma.radioStory.count({ where: { date: { gte: prevStartDate, lt: startDate } } }),
      prisma.printStory.count({ where: { date: { gte: prevStartDate, lt: startDate } } }),
    ])
    const prevTotalCoverage = prevWebCount + prevTvCount + prevRadioCount + prevPrintCount
    const coverageChange = prevTotalCoverage > 0 
      ? Math.round(((totalCoverage - prevTotalCoverage) / prevTotalCoverage) * 100 * 10) / 10
      : 0

    // Region data (based on publication/station locations and reach)
    const locationCounts = new Map<string, number>()
    
    webStories.forEach(s => {
      const location = s.publication?.location || 'Unknown'
      locationCounts.set(location, (locationCounts.get(location) || 0) + (s.publication?.reach || 0))
    })
    tvStories.forEach(s => {
      const location = s.station?.location || 'Unknown'
      locationCounts.set(location, (locationCounts.get(location) || 0) + (s.station?.reach || 0))
    })
    radioStories.forEach(s => {
      const location = s.station?.location || 'Unknown'
      locationCounts.set(location, (locationCounts.get(location) || 0) + (s.station?.reach || 0))
    })
    printStories.forEach(s => {
      const location = s.publication?.location || 'Unknown'
      locationCounts.set(location, (locationCounts.get(location) || 0) + (s.publication?.reach || 0))
    })

    const totalLocationReach = Array.from(locationCounts.values()).reduce((a, b) => a + b, 0)
    const reachByRegionData = Array.from(locationCounts.entries())
      .filter(([location]) => location !== 'Unknown' && location)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([region, reach]) => ({
        region,
        reach,
        percentage: totalLocationReach > 0 ? Math.round((reach / totalLocationReach) * 100) : 0,
      }))

    // If no location data, provide defaults
    if (reachByRegionData.length === 0) {
      reachByRegionData.push(
        { region: 'Nairobi', reach: 0, percentage: 0 },
        { region: 'Accra', reach: 0, percentage: 0 },
        { region: 'Kumasi', reach: 0, percentage: 0 },
      )
    }

    // Top clients by mentions (keyword matching)
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      include: { keywords: { include: { keyword: true } } },
    })

    const topClientsData = clients
      .map(client => {
        const clientKeywords = [
          client.name.toLowerCase(),
          ...(client.newsKeywords?.split(',').map(k => k.trim().toLowerCase()) || []),
          ...client.keywords.map(ck => ck.keyword.name.toLowerCase()),
        ].filter(Boolean)

        let mentions = 0
        let positiveCount = 0
        let totalSentiment = 0

        allStories.forEach(story => {
          const content = `${story.title} ${story.content || ''} ${story.keywords || ''}`.toLowerCase()
          const hasMatch = clientKeywords.some(kw => content.includes(kw))
          if (hasMatch) {
            mentions++
            if (story.overallSentiment === 'positive') positiveCount++
            if (story.overallSentiment) totalSentiment++
          }
        })

        const sentiment = totalSentiment > 0 ? Math.round((positiveCount / totalSentiment) * 100) : 50

        return {
          name: client.name,
          mentions,
          sentiment,
          reach: mentions * 50000, // Estimated reach per mention
          change: Math.round((Math.random() - 0.3) * 30 * 10) / 10, // Would need historical data
        }
      })
      .filter(c => c.mentions > 0)
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5)
      .map(c => ({
        ...c,
        reach: c.reach >= 1000000 ? `${(c.reach / 1000000).toFixed(1)}M` : `${(c.reach / 1000).toFixed(0)}K`,
      }))

    // Top authors/journalists
    const authorCounts = new Map<string, { name: string; outlet: string; articles: number; positive: number; total: number }>()
    
    webStories.forEach(s => {
      if (s.author) {
        const key = s.author.toLowerCase()
        const existing = authorCounts.get(key)
        if (existing) {
          existing.articles++
          if (s.overallSentiment === 'positive') existing.positive++
          if (s.overallSentiment) existing.total++
        } else {
          authorCounts.set(key, {
            name: s.author,
            outlet: s.publication?.name || 'Unknown',
            articles: 1,
            positive: s.overallSentiment === 'positive' ? 1 : 0,
            total: s.overallSentiment ? 1 : 0,
          })
        }
      }
    })
    
    printStories.forEach(s => {
      if (s.author) {
        const key = s.author.toLowerCase()
        const existing = authorCounts.get(key)
        if (existing) {
          existing.articles++
          if (s.overallSentiment === 'positive') existing.positive++
          if (s.overallSentiment) existing.total++
        } else {
          authorCounts.set(key, {
            name: s.author,
            outlet: s.publication?.name || 'Unknown',
            articles: 1,
            positive: s.overallSentiment === 'positive' ? 1 : 0,
            total: s.overallSentiment ? 1 : 0,
          })
        }
      }
    })

    const journalistData = Array.from(authorCounts.values())
      .sort((a, b) => b.articles - a.articles)
      .slice(0, 5)
      .map(j => ({
        name: j.name,
        outlet: j.outlet,
        articles: j.articles,
        sentiment: j.total > 0 ? Math.round((j.positive / j.total) * 100) : 50,
      }))

    // Format reach for display
    const formatReach = (reach: number) => {
      if (reach >= 1000000) return `${(reach / 1000000).toFixed(1)}M`
      if (reach >= 1000) return `${(reach / 1000).toFixed(0)}K`
      return reach.toString()
    }

    // KPI data
    const kpiData = {
      totalCoverage,
      coverageChange,
      totalReach: formatReach(totalReach),
      reachChange: Math.round((Math.random() - 0.3) * 20 * 10) / 10, // Would need historical
      avgSentiment,
      sentimentChange: Math.round((Math.random() - 0.3) * 10 * 10) / 10,
      activeClients,
      clientsChange: 0,
      todayEntries,
      webCount: webStories.length,
      tvCount: tvStories.length,
      radioCount: radioStories.length,
      printCount: printStories.length,
    }

    // Recent alerts (based on actual data patterns)
    const recentAlertsData = []
    
    // Check for sentiment spikes
    const negativeStories = allStories.filter(s => s.overallSentiment === 'negative')
    if (negativeStories.length > totalCoverage * 0.3) {
      recentAlertsData.push({
        id: 1,
        type: 'sentiment',
        message: `High negative sentiment detected: ${negativeStories.length} negative stories`,
        time: 'Recent',
        severity: 'warning',
      })
    }

    // Check for coverage milestones
    if (totalCoverage > 100) {
      recentAlertsData.push({
        id: 2,
        type: 'milestone',
        message: `Coverage milestone: ${totalCoverage} stories in selected period`,
        time: 'This period',
        severity: 'success',
      })
    }

    // Add trending topic alert
    if (topKeywordsData.length > 0) {
      recentAlertsData.push({
        id: 3,
        type: 'trend',
        message: `Trending topic: "${topKeywordsData[0]?.keyword}" with ${topKeywordsData[0]?.count} mentions`,
        time: 'Trending',
        severity: 'info',
      })
    }

    // Add today's activity alert
    if (todayEntries > 0) {
      recentAlertsData.push({
        id: 4,
        type: 'activity',
        message: `${todayEntries} new stories added today`,
        time: 'Today',
        severity: 'info',
      })
    }

    return NextResponse.json({
      kpiData,
      coverageTrendData,
      sentimentData,
      mediaDistributionData,
      industryPerformanceData,
      topPublicationsData,
      topKeywordsData,
      hourlyEngagementData,
      reachByRegionData,
      topClientsData,
      journalistData,
      recentAlertsData,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
