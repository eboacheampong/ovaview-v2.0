import { prisma } from '@/lib/prisma'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const MODELS = [
  'meta-llama/llama-3.1-8b-instruct',
  'mistralai/mistral-nemo',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
]

// ─── Types ───────────────────────────────────────────────────────────

export interface MentionStats {
  total: number
  web: number
  tv: number
  radio: number
  print: number
  social: number
  positive: number
  neutral: number
  negative: number
  totalReach: number
  bySource: { name: string; count: number; reach: number }[]
  socialByPlatform: { platform: string; count: number; reach: number }[]
  dailyActivity: { date: string; count: number }[]
  topMentions: {
    title: string
    source: string
    sentiment: string | null
    date: Date
    url: string | null
    reach: number
    followers?: number
  }[]
}

export interface PeriodComparison {
  current: MentionStats
  previous: MentionStats
  mentionChange: number
  mentionChangePercent: number
  reachChange: number
  reachChangePercent: number
  positiveChange: number
  negativeChange: number
}

export interface WeeklyReportData {
  clientName: string
  projectName: string
  dateRange: { start: Date; end: Date }
  stats: MentionStats
  comparison: PeriodComparison
  aiSummary: string
  sentimentBreakdown: { positive: number; neutral: number; negative: number }
  sourceDistribution: { source: string; percentage: number }[]
  topAuthors: { name: string; mentions: number; reach: number }[]
}

export interface MonthlyReportData {
  clientName: string
  projectName: string
  dateRange: { start: Date; end: Date }
  stats: MentionStats
  comparison: PeriodComparison
  aiInsights: string
  aiTrends: string
  aiRecommendations: string
  headline: string
  sentimentBreakdown: { positive: number; neutral: number; negative: number }
}

// ─── Data Gathering ──────────────────────────────────────────────────

async function gatherMentionStats(
  clientId: string,
  startDate: Date,
  endDate: Date
): Promise<MentionStats> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      industries: { select: { industryId: true } },
      keywords: { include: { keyword: true } },
    },
  })
  if (!client) throw new Error('Client not found')

  const industryIds = client.industries.map((i: { industryId: string }) => i.industryId)
  const keywordNames = client.keywords.map((k: { keyword: { name: string } }) => k.keyword.name.toLowerCase())
  const hasIndustries = industryIds.length > 0
  const hasKeywords = keywordNames.length > 0

  const dateFilter = { gte: startDate, lte: endDate }
  const buildWhere = (dateField: string) => ({
    [dateField]: dateFilter,
    ...(hasIndustries || hasKeywords ? {
      OR: [
        ...(hasIndustries ? [{ industryId: { in: industryIds } }] : []),
        ...(hasKeywords ? keywordNames.flatMap((kw: string) => [
          { title: { contains: kw, mode: 'insensitive' as const } },
          { keywords: { contains: kw, mode: 'insensitive' as const } },
        ]) : []),
      ],
    } : {}),
  })

  // Fetch all media types
  const [webStories, tvStories, radioStories, printStories, socialPosts] = await Promise.all([
    prisma.webStory.findMany({
      where: buildWhere('date'),
      include: { publication: { select: { name: true, reach: true } }, images: { take: 1 } },
      orderBy: { date: 'desc' },
    }),
    prisma.tVStory.findMany({
      where: buildWhere('date'),
      include: { station: { select: { name: true, reach: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.radioStory.findMany({
      where: buildWhere('date'),
      include: { station: { select: { name: true, reach: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.printStory.findMany({
      where: buildWhere('date'),
      include: { publication: { select: { name: true, reach: true } }, images: { take: 1 } },
      orderBy: { date: 'desc' },
    }),
    db.socialPost.findMany({
      where: {
        postedAt: dateFilter,
        OR: [
          { clientId },
          ...(hasIndustries ? [{ industryId: { in: industryIds } }] : []),
          ...(hasKeywords ? keywordNames.flatMap((kw: string) => [
            { content: { contains: kw, mode: 'insensitive' } },
            { keywords: { contains: kw, mode: 'insensitive' } },
          ]) : []),
        ],
      },
      include: { account: { select: { handle: true, platform: true, followersCount: true } } },
      orderBy: { postedAt: 'desc' },
    }),
  ])

  // Build source stats
  const sourceMap = new Map<string, { count: number; reach: number }>()
  const addSource = (name: string, reach: number) => {
    const existing = sourceMap.get(name) || { count: 0, reach: 0 }
    sourceMap.set(name, { count: existing.count + 1, reach: existing.reach + reach })
  }

  let totalReach = 0
  let positive = 0, neutral = 0, negative = 0

  const countSentiment = (s: string | null) => {
    if (!s) { neutral++; return }
    const sl = s.toLowerCase()
    if (sl === 'positive') positive++
    else if (sl === 'negative') negative++
    else neutral++
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topMentions: MentionStats['topMentions'] = []
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const platformMap = new Map<string, { count: number; reach: number }>()
  const dailyMap = new Map<string, number>()
  for (const s of webStories) {
    const reach = s.publication?.reach || 0
    totalReach += reach
    countSentiment(s.overallSentiment)
    addSource(s.publication?.name || 'Unknown', reach)
    const dayKey = s.date.toISOString().split('T')[0]
    dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1)
    topMentions.push({
      title: s.title, source: s.publication?.name || 'Web',
      sentiment: s.overallSentiment, date: s.date,
      url: `${APP_URL}/media/web/${s.slug}`, reach,
    })
  }
  for (const s of tvStories) {
    const reach = s.station?.reach || 0
    totalReach += reach
    countSentiment(s.overallSentiment)
    addSource(s.station?.name || 'Unknown', reach)
    const dayKey = s.date.toISOString().split('T')[0]
    dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1)
    topMentions.push({
      title: s.title, source: s.station?.name || 'TV',
      sentiment: s.overallSentiment, date: s.date,
      url: `${APP_URL}/media/tv/${s.slug}`, reach,
    })
  }
  for (const s of radioStories) {
    const reach = s.station?.reach || 0
    totalReach += reach
    countSentiment(s.overallSentiment)
    addSource(s.station?.name || 'Unknown', reach)
    const dayKey = s.date.toISOString().split('T')[0]
    dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1)
    topMentions.push({
      title: s.title, source: s.station?.name || 'Radio',
      sentiment: s.overallSentiment, date: s.date,
      url: `${APP_URL}/media/radio/${s.slug}`, reach,
    })
  }
  for (const s of printStories) {
    const reach = s.publication?.reach || 0
    totalReach += reach
    countSentiment(s.overallSentiment)
    addSource(s.publication?.name || 'Unknown', reach)
    const dayKey = s.date.toISOString().split('T')[0]
    dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1)
    topMentions.push({
      title: s.title, source: s.publication?.name || 'Print',
      sentiment: s.overallSentiment, date: s.date,
      url: `${APP_URL}/media/print/${s.slug}`, reach,
    })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of socialPosts as any[]) {
    const reach = p.account?.followersCount || 0
    totalReach += reach
    countSentiment(p.overallSentiment)
    const sourceName = p.account ? `@${p.account.handle}` : (p.authorHandle || 'Social')
    addSource(sourceName, reach)
    // Track by platform
    const plat = p.platform || 'UNKNOWN'
    const existing = platformMap.get(plat) || { count: 0, reach: 0 }
    platformMap.set(plat, { count: existing.count + 1, reach: existing.reach + reach })
    const dayKey = new Date(p.postedAt).toISOString().split('T')[0]
    dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1)
    topMentions.push({
      title: (p.content?.substring(0, 200) || 'Social Post'),
      source: sourceName, sentiment: p.overallSentiment,
      date: p.postedAt, url: p.postUrl, reach,
      followers: p.account?.followersCount,
    })
  }

  // Sort top mentions by reach
  topMentions.sort((a, b) => b.reach - a.reach)

  const bySource = Array.from(sourceMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.reach - a.reach)

  const socialByPlatform = Array.from(platformMap.entries())
    .map(([platform, data]) => ({ platform, ...data }))
    .sort((a, b) => b.count - a.count)

  const dailyActivity = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    total: webStories.length + tvStories.length + radioStories.length + printStories.length + socialPosts.length,
    web: webStories.length,
    tv: tvStories.length,
    radio: radioStories.length,
    print: printStories.length,
    social: socialPosts.length,
    positive, neutral, negative,
    totalReach,
    bySource,
    socialByPlatform,
    dailyActivity,
    topMentions: topMentions.slice(0, 10),
  }
}


// ─── AI Call with Fallback ───────────────────────────────────────────

async function callAI(prompt: string, maxTokens: number = 1500): Promise<string> {
  const errors: string[] = []
  for (const model of MODELS) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: maxTokens,
        }),
      })

      if (!res.ok) {
        errors.push(`${model}: HTTP ${res.status}`)
        continue
      }

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (content) return content.trim()
      errors.push(`${model}: empty response`)
    } catch (e) {
      errors.push(`${model}: ${e instanceof Error ? e.message : 'unknown error'}`)
      continue
    }
  }
  throw new Error(`All AI models failed: ${errors.join('; ')}`)
}


function parseJSON(text: string): Record<string, unknown> {
  let jsonText = text.trim()
  // Strip markdown code blocks
  const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) jsonText = match[1].trim()
  // Try to find JSON object in the text
  const jsonStart = jsonText.indexOf('{')
  const jsonEnd = jsonText.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    jsonText = jsonText.substring(jsonStart, jsonEnd + 1)
  }
  // Fix common AI issues: trailing commas before } or ]
  jsonText = jsonText.replace(/,\s*([}\]])/g, '$1')
  return JSON.parse(jsonText)
}

// ─── Period Helpers ──────────────────────────────────────────────────

export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

export function getPreviousWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const currentWeek = getWeekRange(date)
  const end = new Date(currentWeek.start)
  end.setDate(end.getDate() - 1)
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

export function getMonthRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export function getPreviousMonthRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth() - 1, 1, 0, 0, 0, 0)
  const end = new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999)
  return { start, end }
}

function buildComparison(current: MentionStats, previous: MentionStats): PeriodComparison {
  const mentionChange = current.total - previous.total
  const mentionChangePercent = previous.total > 0
    ? Math.round((mentionChange / previous.total) * 100)
    : current.total > 0 ? 100 : 0
  const reachChange = current.totalReach - previous.totalReach
  const reachChangePercent = previous.totalReach > 0
    ? Math.round((reachChange / previous.totalReach) * 100)
    : current.totalReach > 0 ? 100 : 0

  return {
    current, previous,
    mentionChange, mentionChangePercent,
    reachChange, reachChangePercent,
    positiveChange: current.positive - previous.positive,
    negativeChange: current.negative - previous.negative,
  }
}

// ─── Weekly Report Generation ────────────────────────────────────────

export async function generateWeeklyReport(
  clientId: string,
  date?: Date,
  customRange?: { start: Date; end: Date }
): Promise<WeeklyReportData> {
  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) throw new Error('Client not found')

  const currentRange = customRange
    ? { start: new Date(customRange.start), end: new Date(customRange.end) }
    : getWeekRange(date)
  // Previous range = same duration before the current range
  const durationMs = currentRange.end.getTime() - currentRange.start.getTime()
  const previousRange = customRange
    ? { start: new Date(currentRange.start.getTime() - durationMs - 1), end: new Date(currentRange.start.getTime() - 1) }
    : getPreviousWeekRange(date)

  const [currentStats, previousStats] = await Promise.all([
    gatherMentionStats(clientId, currentRange.start, currentRange.end),
    gatherMentionStats(clientId, previousRange.start, previousRange.end),
  ])

  const comparison = buildComparison(currentStats, previousStats)

  // Build concise data summary for AI (token-efficient)
  const dataSummary = `Client: ${client.name}
Period: ${currentRange.start.toISOString().split('T')[0]} to ${currentRange.end.toISOString().split('T')[0]}
Total mentions: ${currentStats.total} (prev: ${previousStats.total}, change: ${comparison.mentionChangePercent}%)
Total reach: ${formatNumber(currentStats.totalReach)} (prev: ${formatNumber(previousStats.totalReach)}, change: ${comparison.reachChangePercent}%)
Positive: ${currentStats.positive} (prev: ${previousStats.positive})
Negative: ${currentStats.negative} (prev: ${previousStats.negative})
Neutral: ${currentStats.neutral}
By type: Web=${currentStats.web}, TV=${currentStats.tv}, Radio=${currentStats.radio}, Print=${currentStats.print}, Social=${currentStats.social}
Social by platform: ${currentStats.socialByPlatform.map(s => `${s.platform}=${s.count}(${formatNumber(s.reach)} reach)`).join(', ') || 'none'}
Top sources: ${currentStats.bySource.slice(0, 5).map(s => `${s.name}(${s.count} mentions, ${formatNumber(s.reach)} reach)`).join('; ')}
Top mentions: ${currentStats.topMentions.slice(0, 5).map(m => `"${m.title}" by ${m.source} (${m.sentiment || 'neutral'})`).join('; ')}`

  const aiSummary = await callAI(
    `You are a media monitoring analyst. Write a concise 3-5 sentence OBSERVATIONAL summary of this week's media performance for the client. Report what happened: key changes in mentions and reach, notable stories, sentiment shifts, source distribution, and engagement patterns. Use specific numbers from the data. Do NOT give advice or recommendations — just report the facts.\n\nData:\n${dataSummary}\n\nWrite ONLY the summary paragraph, no headers or labels.`,
    400
  )

  // Source distribution
  const totalMentions = currentStats.total || 1
  const sourceDistribution = [
    { source: 'Web', percentage: Math.round((currentStats.web / totalMentions) * 1000) / 10 },
    { source: 'TV', percentage: Math.round((currentStats.tv / totalMentions) * 1000) / 10 },
    { source: 'Radio', percentage: Math.round((currentStats.radio / totalMentions) * 1000) / 10 },
    { source: 'Print', percentage: Math.round((currentStats.print / totalMentions) * 1000) / 10 },
    { source: 'Social', percentage: Math.round((currentStats.social / totalMentions) * 1000) / 10 },
  ].filter(s => s.percentage > 0)

  // Top authors from bySource
  const topAuthors = currentStats.bySource.slice(0, 5).map(s => ({
    name: s.name, mentions: s.count, reach: s.reach,
  }))

  const sentTotal = currentStats.positive + currentStats.neutral + currentStats.negative || 1
  const sentimentBreakdown = {
    positive: Math.round((currentStats.positive / sentTotal) * 100),
    neutral: Math.round((currentStats.neutral / sentTotal) * 100),
    negative: Math.round((currentStats.negative / sentTotal) * 100),
  }

  return {
    clientName: client.name,
    projectName: client.name,
    dateRange: currentRange,
    stats: currentStats,
    comparison,
    aiSummary,
    sentimentBreakdown,
    sourceDistribution,
    topAuthors,
  }
}

// ─── Monthly Report Generation ───────────────────────────────────────

export async function generateMonthlyReport(
  clientId: string,
  date?: Date,
  customRange?: { start: Date; end: Date }
): Promise<MonthlyReportData> {
  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) throw new Error('Client not found')

  const currentRange = customRange
    ? { start: new Date(customRange.start), end: new Date(customRange.end) }
    : getMonthRange(date)
  const durationMs = currentRange.end.getTime() - currentRange.start.getTime()
  const previousRange = customRange
    ? { start: new Date(currentRange.start.getTime() - durationMs - 1), end: new Date(currentRange.start.getTime() - 1) }
    : getPreviousMonthRange(date)

  const [currentStats, previousStats] = await Promise.all([
    gatherMentionStats(clientId, currentRange.start, currentRange.end),
    gatherMentionStats(clientId, previousRange.start, previousRange.end),
  ])

  const comparison = buildComparison(currentStats, previousStats)

  // Compute peak activity days (top 3)
  const peakDays = [...currentStats.dailyActivity]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
  const peakDaysStr = peakDays.length > 0
    ? peakDays.map(d => `${d.date} (${d.count} mentions)`).join(', ')
    : 'no daily data'

  const dataSummary = `Client: ${client.name}
Period: ${currentRange.start.toISOString().split('T')[0]} to ${currentRange.end.toISOString().split('T')[0]}
Previous period: ${previousRange.start.toISOString().split('T')[0]} to ${previousRange.end.toISOString().split('T')[0]}
Total mentions: ${currentStats.total} (prev: ${previousStats.total}, change: ${comparison.mentionChangePercent}%)
Total reach: ${formatNumber(currentStats.totalReach)} (prev: ${formatNumber(previousStats.totalReach)}, change: ${comparison.reachChangePercent}%)
Positive: ${currentStats.positive} (prev: ${previousStats.positive})
Negative: ${currentStats.negative} (prev: ${previousStats.negative})
Neutral: ${currentStats.neutral}
By type: Web=${currentStats.web}, TV=${currentStats.tv}, Radio=${currentStats.radio}, Print=${currentStats.print}, Social=${currentStats.social}
Social by platform: ${currentStats.socialByPlatform.map(s => `${s.platform}=${s.count}(${formatNumber(s.reach)} reach)`).join(', ') || 'none'}
Peak activity days: ${peakDaysStr}
Top sources: ${currentStats.bySource.slice(0, 8).map(s => `${s.name}(${s.count} mentions, ${formatNumber(s.reach)} reach)`).join('; ')}
Top mentions: ${currentStats.topMentions.slice(0, 8).map(m => `"${m.title}" by ${m.source} (${m.sentiment || 'neutral'}, reach: ${formatNumber(m.reach)})`).join('; ')}`

  // Single AI call for all monthly insights (token efficient)
  let parsed: Record<string, unknown>
  try {
    const aiResponse = await callAI(
      `You are a senior media monitoring analyst. Analyze this monthly media data and return a JSON object with these fields:
- "headline": A compelling one-line headline summarizing the month (e.g., "A 51% Decrease in ${client.name} Mentions"). Include the percentage change.
- "insights": 4-5 detailed OBSERVATIONAL insight paragraphs. Report ONLY what happened — key themes, campaigns, events, patterns, source distribution, sentiment shifts, and engagement data. Do NOT give advice or recommendations here. Each paragraph should be 2-3 sentences with specific numbers from the data. Separate paragraphs with \\n\\n.
- "trends": A string with 4-5 bullet points comparing this month to previous month. IMPORTANT: Each bullet must be on its own line separated by \\n. Start each line with "•". Include specific numbers: mention counts, reach changes, sentiment shifts, and peak activity days from the data provided. Do NOT say data is unavailable — use the peak activity days provided.
- "recommendations": 3-4 actionable strategic recommendation paragraphs. THIS is where advice belongs. Each should be 2-3 sentences. Separate paragraphs with \\n\\n.

CRITICAL FORMATTING RULES:
1. In "trends", separate each bullet with \\n, NOT periods or commas. Do NOT include any preamble like "Here are 4-5 bullet points..." — start directly with the first "•" bullet.
2. In "recommendations", each recommendation MUST be a single continuous paragraph combining the title and explanation into one flowing text. Do NOT separate the title from the body with a newline. WRONG: "Expand Social Media\\n\\nThe company should..." CORRECT: "Expand social media presence by developing a comprehensive strategy that..." Do NOT include any preamble like "Here are recommendations..." or "Based on the data...". Do NOT use markdown formatting like **bold** or headers. Do NOT number them like "Recommendation 1:" or use title-then-body format.
3. In "insights", each insight MUST be a single continuous paragraph. Do NOT use a title-then-body format. Do NOT use markdown. Write plain text only. No **bold**, no headers, no numbering.
4. All fields must contain plain text only — no markdown syntax anywhere.
5. NEVER start any field with a preamble sentence like "Here are...", "Based on the data...", "Below are...", "The following...".

Data:\n${dataSummary}

Return ONLY valid JSON, no markdown.`,
      2000
    )
    parsed = parseJSON(aiResponse)
  } catch {
    // First AI call failed or returned invalid JSON — try individual calls
    try {
      const [insightsText, trendsText, recsText] = await Promise.all([
        callAI(`You are a media monitoring analyst. Write 4-5 OBSERVATIONAL insight paragraphs about this client's monthly media performance. Report ONLY what happened — themes, patterns, source distribution, sentiment. Use specific numbers. Each insight must be a single continuous paragraph (no title-then-body format). Separate paragraphs with blank lines. No advice. No preamble. No markdown.\n\nData:\n${dataSummary}`, 800),
        callAI(`Write 4-5 bullet points comparing this month to previous month. Start each with "•". Include specific numbers for mention counts, reach changes, sentiment shifts. Do NOT include any preamble like "Here are..." — start directly with the first bullet.\n\nData:\n${dataSummary}`, 400),
        callAI(`Write 3-4 actionable strategic recommendation paragraphs for this client based on their media data. Each recommendation must be a single continuous paragraph combining the action and explanation (no title-then-body format). Each 2-3 sentences with specific actions. Separate with blank lines. No preamble. No markdown. No numbering.\n\nData:\n${dataSummary}`, 500),
      ])
      parsed = {
        headline: `${Math.abs(comparison.mentionChangePercent)}% ${comparison.mentionChangePercent >= 0 ? 'Increase' : 'Decrease'} in ${client.name} Mentions`,
        insights: insightsText,
        trends: trendsText,
        recommendations: recsText,
      }
    } catch {
      // All AI calls failed — build data-driven fallback from real numbers
      const topSources = currentStats.bySource.slice(0, 3).map(s => `${s.name} (${s.count} mentions, ${formatNumber(s.reach)} reach)`).join(', ')
      const sourceTypes = [
        currentStats.web > 0 ? `Web (${Math.round((currentStats.web / (currentStats.total || 1)) * 100)}%)` : '',
        currentStats.tv > 0 ? `TV (${Math.round((currentStats.tv / (currentStats.total || 1)) * 100)}%)` : '',
        currentStats.radio > 0 ? `Radio (${Math.round((currentStats.radio / (currentStats.total || 1)) * 100)}%)` : '',
        currentStats.print > 0 ? `Print (${Math.round((currentStats.print / (currentStats.total || 1)) * 100)}%)` : '',
        currentStats.social > 0 ? `Social (${Math.round((currentStats.social / (currentStats.total || 1)) * 100)}%)` : '',
      ].filter(Boolean).join(', ')

      parsed = {
        headline: `${Math.abs(comparison.mentionChangePercent)}% ${comparison.mentionChangePercent >= 0 ? 'Increase' : 'Decrease'} in ${client.name} Mentions`,
        insights: `During the period ${currentRange.start.toISOString().split('T')[0]} to ${currentRange.end.toISOString().split('T')[0]}, ${client.name} recorded ${currentStats.total} total mentions with a total reach of ${formatNumber(currentStats.totalReach)}. This represents a ${Math.abs(comparison.mentionChangePercent)}% ${comparison.mentionChangePercent >= 0 ? 'increase' : 'decrease'} compared to the previous month.\n\nMentions were distributed across ${sourceTypes}. The top sources were ${topSources}.\n\nSentiment analysis shows ${currentStats.positive} positive, ${currentStats.neutral} neutral, and ${currentStats.negative} negative mentions.`,
        trends: `• Total mentions ${comparison.mentionChangePercent >= 0 ? 'increased' : 'decreased'} by ${Math.abs(comparison.mentionChangePercent)}% from ${previousStats.total} to ${currentStats.total}\n• Total reach ${comparison.reachChangePercent >= 0 ? 'increased' : 'decreased'} by ${Math.abs(comparison.reachChangePercent)}% from ${formatNumber(previousStats.totalReach)} to ${formatNumber(currentStats.totalReach)}\n• Positive mentions changed from ${previousStats.positive} to ${currentStats.positive}\n• Negative mentions changed from ${previousStats.negative} to ${currentStats.negative}`,
        recommendations: 'Strategic recommendations require AI analysis. Please try sending the report again.',
      }
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const monthName = monthNames[currentRange.start.getMonth()]

  const sentTotal = currentStats.positive + currentStats.neutral + currentStats.negative || 1

  return {
    clientName: client.name,
    projectName: client.name,
    dateRange: currentRange,
    stats: currentStats,
    comparison,
    aiInsights: String(parsed.insights || ''),
    aiTrends: String(parsed.trends || ''),
    aiRecommendations: String(parsed.recommendations || ''),
    headline: String(parsed.headline || `${monthName} AI Insights Report for ${client.name}`),
    sentimentBreakdown: {
      positive: Math.round((currentStats.positive / sentTotal) * 100),
      neutral: Math.round((currentStats.neutral / sentTotal) * 100),
      negative: Math.round((currentStats.negative / sentTotal) * 100),
    },
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return num.toString()
}

export function formatReach(num: number): string {
  return formatNumber(num)
}
