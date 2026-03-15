import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDailyReach } from '@/lib/reach-utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODELS = ['meta-llama/llama-3.1-8b-instruct', 'mistralai/mistral-nemo', 'openai/gpt-oss-20b']

async function callAI(prompt: string, maxTokens = 1200): Promise<string> {
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1500))
        const res = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: maxTokens }),
        })
        if (!res.ok) continue
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content?.trim()
        if (content && content.length > 10) return content
      } catch { continue }
    }
  }
  return ''
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, days = 30, sections = [], includeInsights = false } = body

    if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

    const since = new Date()
    since.setDate(since.getDate() - days)

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true, name: true, logoUrl: true, newsKeywords: true,
        industries: { include: { industry: { select: { id: true, name: true } } } },
        competitors: {
          where: { isActive: true },
          select: { competitorName: true, competitorKeywords: true, competitorClient: { select: { id: true, name: true } } },
        },
      },
    })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const industryIds = client.industries.map(ci => ci.industry.id)
    const industryNames = client.industries.map(ci => ci.industry.name)

    // Fetch all media data in parallel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any
    const [webStories, tvStories, radioStories, printStories, socialPosts] = await Promise.all([
      prisma.webStory.findMany({
        where: { industryId: { in: industryIds }, date: { gte: since } },
        orderBy: { date: 'desc' },
        include: { publication: { select: { name: true, website: true, reach: true } } },
      }),
      prisma.tVStory.findMany({
        where: { industryId: { in: industryIds }, date: { gte: since } },
        orderBy: { date: 'desc' },
        include: { station: { select: { name: true, reach: true } } },
      }),
      prisma.radioStory.findMany({
        where: { industryId: { in: industryIds }, date: { gte: since } },
        orderBy: { date: 'desc' },
        include: { station: { select: { name: true, reach: true } } },
      }),
      prisma.printStory.findMany({
        where: { industryId: { in: industryIds }, date: { gte: since } },
        orderBy: { date: 'desc' },
        include: { publication: { select: { name: true, reach: true } } },
      }),
      db.socialPost.findMany({
        where: { clientId, status: 'accepted', postedAt: { gte: since } },
        orderBy: { postedAt: 'desc' },
      }),
    ])

    // Build unified mentions
    interface MentionItem {
      id: string; type: string; title: string; source: string; author: string;
      date: Date; summary: string; sentiment: string; reach: number;
      platform?: string; engagement?: number; keywords?: string; keyPersonalities?: string;
    }

    const mentions: MentionItem[] = []

    for (const s of webStories) {
      const reach = calculateDailyReach(s.publication?.reach || 0, s.date)
      mentions.push({
        id: s.id, type: 'web', title: s.title, source: s.publication?.name || 'Web',
        author: (s as any).author || '', date: s.date, summary: s.summary || '',
        sentiment: s.overallSentiment || 'neutral', reach,
        keywords: s.keywords || undefined, keyPersonalities: (s as any).keyPersonalities || undefined,
      })
    }
    for (const s of tvStories) {
      const reach = calculateDailyReach(s.station?.reach || 0, s.date)
      mentions.push({
        id: s.id, type: 'tv', title: s.title, source: s.station?.name || 'TV',
        author: s.presenters || '', date: s.date, summary: s.summary || '',
        sentiment: s.overallSentiment || 'neutral', reach,
        keywords: s.keywords || undefined, keyPersonalities: (s as any).keyPersonalities || undefined,
      })
    }
    for (const s of radioStories) {
      const reach = calculateDailyReach(s.station?.reach || 0, s.date)
      mentions.push({
        id: s.id, type: 'radio', title: s.title, source: s.station?.name || 'Radio',
        author: s.presenters || '', date: s.date, summary: s.summary || '',
        sentiment: s.overallSentiment || 'neutral', reach,
        keywords: s.keywords || undefined, keyPersonalities: (s as any).keyPersonalities || undefined,
      })
    }
    for (const s of printStories) {
      const reach = calculateDailyReach(s.publication?.reach || 0, s.date)
      mentions.push({
        id: s.id, type: 'print', title: s.title, source: s.publication?.name || 'Print',
        author: (s as any).author || '', date: s.date, summary: s.summary || '',
        sentiment: s.overallSentiment || 'neutral', reach,
        keywords: s.keywords || undefined, keyPersonalities: (s as any).keyPersonalities || undefined,
      })
    }
    for (const s of socialPosts) {
      const eng = (s.likesCount || 0) + (s.commentsCount || 0) + (s.sharesCount || 0)
      mentions.push({
        id: s.id, type: 'social', title: s.content?.substring(0, 100) || 'Social post',
        source: s.platform || 'Social', author: s.authorName || s.authorHandle || '',
        date: s.postedAt, summary: s.content || '',
        sentiment: s.overallSentiment || 'neutral', reach: s.viewsCount || 0,
        platform: s.platform, engagement: eng,
        keywords: s.keywords || undefined,
      })
    }

    mentions.sort((a, b) => b.date.getTime() - a.date.getTime())

    // Compute stats
    const totalMentions = mentions.length
    const positive = mentions.filter(m => m.sentiment === 'positive').length
    const negative = mentions.filter(m => m.sentiment === 'negative').length
    const neutral = totalMentions - positive - negative
    const totalReach = mentions.reduce((s, m) => s + m.reach, 0)
    const totalInteractions = socialPosts.reduce((s: number, p: any) =>
      s + (p.likesCount || 0) + (p.commentsCount || 0) + (p.sharesCount || 0), 0)

    // Source counts
    const sourceCounts: Record<string, number> = {}
    mentions.forEach(m => {
      const key = m.type === 'social' ? (m.platform || 'Social') : m.type.charAt(0).toUpperCase() + m.type.slice(1)
      sourceCounts[key] = (sourceCounts[key] || 0) + 1
    })

    // Media type stats
    const mediaTypes = Array.from(new Set(mentions.map(m =>
      m.type === 'social' ? 'Social Media' : m.type.charAt(0).toUpperCase() + m.type.slice(1)
    )))
    const mediaStats = mediaTypes.map(type => {
      const items = mentions.filter(m =>
        (m.type === 'social' ? 'Social Media' : m.type.charAt(0).toUpperCase() + m.type.slice(1)) === type
      )
      return {
        type, mentions: items.length,
        reach: items.reduce((s, m) => s + m.reach, 0),
        positive: items.filter(m => m.sentiment === 'positive').length,
        negative: items.filter(m => m.sentiment === 'negative').length,
        neutral: items.filter(m => m.sentiment === 'neutral').length,
      }
    }).sort((a, b) => b.mentions - a.mentions)

    // Top sources
    const sourceMap: Record<string, { name: string; count: number; reach: number; positive: number; negative: number; neutral: number }> = {}
    mentions.forEach(m => {
      if (!sourceMap[m.source]) sourceMap[m.source] = { name: m.source, count: 0, reach: 0, positive: 0, negative: 0, neutral: 0 }
      sourceMap[m.source].count++
      sourceMap[m.source].reach += m.reach
      if (m.sentiment === 'positive') sourceMap[m.source].positive++
      else if (m.sentiment === 'negative') sourceMap[m.source].negative++
      else sourceMap[m.source].neutral++
    })
    const topSources = Object.values(sourceMap).sort((a, b) => b.count - a.count).slice(0, 15)

    // Daily chart
    const dailyMap: Record<string, { mentions: number; reach: number; positive: number; negative: number; neutral: number }> = {}
    mentions.forEach(m => {
      const day = m.date.toISOString().slice(0, 10)
      if (!dailyMap[day]) dailyMap[day] = { mentions: 0, reach: 0, positive: 0, negative: 0, neutral: 0 }
      dailyMap[day].mentions++
      dailyMap[day].reach += m.reach
      if (m.sentiment === 'positive') dailyMap[day].positive++
      else if (m.sentiment === 'negative') dailyMap[day].negative++
      else dailyMap[day].neutral++
    })
    const chart = Object.entries(dailyMap)
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Keywords
    const keywordMap: Record<string, { count: number; positive: number; negative: number; neutral: number }> = {}
    mentions.forEach(m => {
      if (m.keywords) {
        m.keywords.split(',').map(k => k.trim()).filter(Boolean).forEach(kw => {
          const key = kw.toLowerCase()
          if (!keywordMap[key]) keywordMap[key] = { count: 0, positive: 0, negative: 0, neutral: 0 }
          keywordMap[key].count++
          if (m.sentiment === 'positive') keywordMap[key].positive++
          else if (m.sentiment === 'negative') keywordMap[key].negative++
          else keywordMap[key].neutral++
        })
      }
    })
    const topKeywords = Object.entries(keywordMap)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    // Key personalities
    const personalityMap: Record<string, { count: number; sources: Set<string> }> = {}
    mentions.forEach(m => {
      if (m.keyPersonalities) {
        m.keyPersonalities.split(',').map(p => p.trim()).filter(Boolean).forEach(person => {
          const key = person.toLowerCase()
          if (!personalityMap[key]) personalityMap[key] = { count: 0, sources: new Set() }
          personalityMap[key].count++
          personalityMap[key].sources.add(m.type)
        })
      }
    })
    const topPersonalities = Object.entries(personalityMap)
      .map(([name, stats]) => ({
        name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        count: stats.count,
        mediaTypes: Array.from(stats.sources),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    // Top journalists/authors
    const authorMap: Record<string, { name: string; count: number; reach: number; outlet: string }> = {}
    mentions.filter(m => m.author && m.type !== 'social').forEach(m => {
      const key = m.author.toLowerCase()
      if (!authorMap[key]) authorMap[key] = { name: m.author, count: 0, reach: 0, outlet: m.source }
      authorMap[key].count++
      authorMap[key].reach += m.reach
    })
    const topJournalists = Object.values(authorMap).sort((a, b) => b.count - a.count).slice(0, 10)

    // Competitor data
    const competitors = client.competitors || []
    const competitorData: { name: string; mentions: number; reach: number }[] = []
    // Simple keyword-based competitor mention counting
    for (const comp of competitors) {
      const compName = comp.competitorClient?.name || comp.competitorName || ''
      const compKeywords = (comp.competitorKeywords || compName).toLowerCase().split(',').map((k: string) => k.trim()).filter(Boolean)
      let compMentions = 0, compReach = 0
      mentions.forEach(m => {
        const text = `${m.title} ${m.summary} ${m.keywords || ''}`.toLowerCase()
        if (compKeywords.some(kw => text.includes(kw))) { compMentions++; compReach += m.reach }
      })
      if (compName) competitorData.push({ name: compName, mentions: compMentions, reach: compReach })
    }
    competitorData.sort((a, b) => b.mentions - a.mentions)

    // Generate AI insights if requested
    let insights: Record<string, string> = {}
    if (includeInsights && OPENROUTER_API_KEY) {
      const rangeStart = since.toISOString().split('T')[0]
      const rangeEnd = new Date().toISOString().split('T')[0]
      const dataSummary = `Client: ${client.name}
Period: ${rangeStart} to ${rangeEnd}
Industries: ${industryNames.join(', ')}
Total mentions: ${totalMentions} (Web: ${webStories.length}, TV: ${tvStories.length}, Radio: ${radioStories.length}, Print: ${printStories.length}, Social: ${socialPosts.length})
Total reach: ${fmtNum(totalReach)}
Sentiment: ${positive} positive, ${neutral} neutral, ${negative} negative
Top sources: ${topSources.slice(0, 5).map(s => `${s.name}(${s.count})`).join(', ')}
Top keywords: ${topKeywords.slice(0, 8).map(k => `${k.name}(${k.count})`).join(', ')}
Top personalities: ${topPersonalities.slice(0, 5).map(p => `${p.name}(${p.count})`).join(', ')}
Competitors: ${competitorData.map(c => `${c.name}(${c.mentions} mentions)`).join(', ') || 'none tracked'}`

      const insightPromises: Promise<void>[] = []

      if (sections.includes('executive_summary')) {
        insightPromises.push(
          callAI(`You are a media monitoring analyst. Write a 4-6 sentence executive summary of the media performance for ${client.name} during ${rangeStart} to ${rangeEnd}. Use specific numbers. Be analytical and professional.\n\nData:\n${dataSummary}\n\nWrite ONLY the summary.`, 500)
            .then(r => { if (r) insights.executive_summary = r })
        )
      }
      if (sections.includes('media_sources')) {
        insightPromises.push(
          callAI(`Analyze the media source distribution for ${client.name}. Which sources dominate? What does this mean for their media strategy? 3-4 sentences, use numbers.\n\nData:\n${dataSummary}\n\nWrite ONLY the analysis.`, 400)
            .then(r => { if (r) insights.media_sources = r })
        )
      }
      if (sections.includes('sentiment_analysis')) {
        insightPromises.push(
          callAI(`Analyze the sentiment breakdown for ${client.name}. What's the overall tone? Any concerns? 3-4 sentences with numbers.\n\nData:\n${dataSummary}\n\nWrite ONLY the analysis.`, 400)
            .then(r => { if (r) insights.sentiment_analysis = r })
        )
      }
      if (sections.includes('coverage_trend')) {
        const peakDays = [...chart].sort((a, b) => b.mentions - a.mentions).slice(0, 3)
        insightPromises.push(
          callAI(`Analyze the coverage trend for ${client.name}. Peak days: ${peakDays.map(d => `${d.date}(${d.mentions})`).join(', ')}. What patterns emerge? 3-4 sentences.\n\nData:\n${dataSummary}\n\nWrite ONLY the analysis.`, 400)
            .then(r => { if (r) insights.coverage_trend = r })
        )
      }
      if (sections.includes('top_sources')) {
        insightPromises.push(
          callAI(`Analyze the top media sources for ${client.name}. Which outlets drive the most coverage? What's the sentiment quality from each? 3-4 sentences.\n\nData:\nTop sources: ${topSources.slice(0, 10).map(s => `${s.name}: ${s.count} mentions, ${fmtNum(s.reach)} reach, +${s.positive}/-${s.negative}`).join('; ')}\n\nWrite ONLY the analysis.`, 400)
            .then(r => { if (r) insights.top_sources = r })
        )
      }
      if (sections.includes('keywords')) {
        insightPromises.push(
          callAI(`Analyze the top keywords/themes in media coverage for ${client.name}. What topics dominate? 3-4 sentences.\n\nKeywords: ${topKeywords.slice(0, 15).map(k => `${k.name}(${k.count})`).join(', ')}\n\nWrite ONLY the analysis.`, 400)
            .then(r => { if (r) insights.keywords = r })
        )
      }
      if (sections.includes('key_personalities')) {
        insightPromises.push(
          callAI(`Analyze the key personalities appearing in media coverage for ${client.name}. Who are the most mentioned? 3-4 sentences.\n\nPersonalities: ${topPersonalities.slice(0, 10).map(p => `${p.name}(${p.count} mentions across ${p.mediaTypes.join(',')})`).join('; ')}\n\nWrite ONLY the analysis.`, 400)
            .then(r => { if (r) insights.key_personalities = r })
        )
      }
      if (sections.includes('competitors') && competitorData.length > 0) {
        insightPromises.push(
          callAI(`Compare ${client.name}'s media presence against competitors. Who has more visibility? 3-4 sentences.\n\n${client.name}: ${totalMentions} mentions, ${fmtNum(totalReach)} reach\nCompetitors: ${competitorData.map(c => `${c.name}: ${c.mentions} mentions, ${fmtNum(c.reach)} reach`).join('; ')}\n\nWrite ONLY the analysis.`, 400)
            .then(r => { if (r) insights.competitors = r })
        )
      }
      if (sections.includes('conclusions')) {
        insightPromises.push(
          callAI(`Write 3-4 key conclusions and actionable recommendations for ${client.name} based on their media monitoring data. Be specific and strategic.\n\nData:\n${dataSummary}\n\nWrite ONLY the conclusions and recommendations.`, 600)
            .then(r => { if (r) insights.conclusions = r })
        )
      }

      await Promise.allSettled(insightPromises)
    }

    return NextResponse.json({
      client: { name: client.name, logoUrl: client.logoUrl },
      industries: industryNames,
      summary: { totalMentions, positive, negative, neutral, totalReach, totalInteractions },
      sourceCounts,
      mediaStats,
      topSources,
      chart,
      topKeywords,
      topPersonalities,
      topJournalists,
      competitorData,
      mentions: mentions.slice(0, 50).map(m => ({
        ...m, date: m.date.toISOString(),
        keyPersonalities: undefined,
      })),
      insights,
    })
  } catch (error) {
    console.error('[PDF Report API] Error:', error)
    return NextResponse.json({ error: 'Failed to generate report data' }, { status: 500 })
  }
}
