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
  // Try each model up to 2 times before moving to the next
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1500)) // wait before retry

        console.log(`[AI] Trying ${model} attempt ${attempt + 1}...`)
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
          const statusText = await res.text().catch(() => '')
          errors.push(`${model}[${attempt}]: HTTP ${res.status} ${statusText.substring(0, 100)}`)
          continue
        }

        const data = await res.json()

        // Check for API-level errors in the response body
        if (data.error) {
          errors.push(`${model}[${attempt}]: ${typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error)}`)
          continue
        }

        const content = data.choices?.[0]?.message?.content
        if (!content || typeof content !== 'string') {
          errors.push(`${model}[${attempt}]: empty/missing content in response`)
          continue
        }

        const trimmed = content.trim()

        // Reject truly empty responses only
        if (trimmed.length < 5) {
          errors.push(`${model}[${attempt}]: response too short (${trimmed.length} chars)`)
          continue
        }

        console.log(`[AI] ✓ ${model} responded successfully (${trimmed.length} chars)`)
        return trimmed
      } catch (e) {
        errors.push(`${model}[${attempt}]: ${e instanceof Error ? e.message : 'unknown error'}`)
        continue
      }
    }
  }
  throw new Error(`All AI models failed after retries: ${errors.join('; ')}`)
}


function parseJSON(text: string): Record<string, unknown> {
  let jsonText = text.trim()

  // Strip markdown code blocks
  const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) jsonText = match[1].trim()

  // Try to find JSON object in the text (skip any preamble text before the JSON)
  const jsonStart = jsonText.indexOf('{')
  const jsonEnd = jsonText.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    jsonText = jsonText.substring(jsonStart, jsonEnd + 1)
  }

  // Fix common AI issues: trailing commas before } or ]
  jsonText = jsonText.replace(/,\s*([}\]])/g, '$1')

  // Attempt 1: direct parse
  try {
    const result = JSON.parse(jsonText)
    console.log('[parseJSON] ✓ Direct parse succeeded')
    return result
  } catch (e1) {
    console.log('[parseJSON] Attempt 1 (direct) failed:', (e1 as Error).message?.substring(0, 80))
  }

  // Attempt 2: fix unescaped newlines/tabs/quotes inside JSON string values
  // Walk character by character, tracking whether we're inside a JSON string
  try {
    let fixed = ''
    let inString = false
    let i = 0
    while (i < jsonText.length) {
      const ch = jsonText[i]

      if (!inString) {
        // Outside a string — just copy and check for string start
        if (ch === '"') { inString = true }
        fixed += ch
        i++
        continue
      }

      // Inside a string
      if (ch === '\\') {
        // Escape sequence — copy both chars as-is (already escaped)
        fixed += ch
        if (i + 1 < jsonText.length) {
          fixed += jsonText[i + 1]
          i += 2
        } else {
          i++
        }
        continue
      }

      if (ch === '"') {
        // End of string
        inString = false
        fixed += ch
        i++
        continue
      }

      // Unescaped special chars inside string — escape them
      if (ch === '\n') { fixed += '\\n'; i++; continue }
      if (ch === '\r') { i++; continue } // skip carriage returns
      if (ch === '\t') { fixed += '\\t'; i++; continue }

      fixed += ch
      i++
    }
    const result = JSON.parse(fixed)
    console.log('[parseJSON] ✓ Attempt 2 (newline fix) succeeded')
    return result
  } catch (e2) {
    console.log('[parseJSON] Attempt 2 (newline fix) failed:', (e2 as Error).message?.substring(0, 80))
  }

  // Attempt 3: extract fields by finding balanced quotes
  // This handles cases where the JSON structure is broken but individual fields are readable
  try {
    const extractField = (field: string): string => {
      // Find "field": " and then read until we find a closing " that's followed by , or }
      // accounting for escaped quotes inside the value
      const fieldPattern = `"${field}"\\s*:\\s*"`
      const re = new RegExp(fieldPattern)
      const m = re.exec(jsonText)
      if (!m) return ''

      const valueStart = m.index + m[0].length
      let value = ''
      let j = valueStart
      while (j < jsonText.length) {
        const c = jsonText[j]
        if (c === '\\' && j + 1 < jsonText.length) {
          // Escaped char — include both
          value += c + jsonText[j + 1]
          j += 2
          continue
        }
        if (c === '"') {
          // Check if this quote is followed by , or } or whitespace+, or whitespace+}
          // which would indicate end of the JSON string value
          const after = jsonText.substring(j + 1, j + 10).trimStart()
          if (after.startsWith(',') || after.startsWith('}')) {
            break // found the real end of the value
          }
          // Otherwise it's an unescaped quote inside the value — include it
          value += c
          j++
          continue
        }
        value += c
        j++
      }

      // Unescape the value
      return value
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
    }

    const headline = extractField('headline')
    const insights = extractField('insights')
    const trends = extractField('trends')
    const recommendations = extractField('recommendations')

    if (headline || insights || trends || recommendations) {
      console.log(`[parseJSON] ✓ Attempt 3 (field extraction) succeeded — headline:${headline.length}, insights:${insights.length}, trends:${trends.length}, recs:${recommendations.length} chars`)
      return { headline, insights, trends, recommendations }
    }
  } catch (e3) {
    console.log('[parseJSON] Attempt 3 (field extraction) failed:', (e3 as Error).message?.substring(0, 80))
  }

  // Attempt 4: if the response is plain text (not JSON at all), the AI might have
  // returned the content directly — treat the whole thing as insights
  if (!jsonText.startsWith('{')) {
    console.log('[parseJSON] Attempt 4: treating raw text as insights')
    return {
      headline: '',
      insights: jsonText,
      trends: '',
      recommendations: '',
    }
  }

  throw new Error(`Failed to parse AI JSON response. First 200 chars: ${jsonText.substring(0, 200)}`)
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

// Build a human-readable period description for AI prompts
function describePeriod(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1

  // Exact calendar month
  if (start.getDate() === 1) {
    const lastOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    if (end.getDate() === lastOfMonth.getDate() && start.getMonth() === end.getMonth()) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      return `${monthNames[start.getMonth()]} ${start.getFullYear()}`
    }
  }

  // Full calendar year
  if (start.getMonth() === 0 && start.getDate() === 1 && end.getMonth() === 11 && end.getDate() === 31 && start.getFullYear() === end.getFullYear()) {
    return `the year ${start.getFullYear()}`
  }

  if (diffDays >= 6 && diffDays <= 8) return 'this week'
  if (diffDays >= 28 && diffDays <= 31) return 'this month'
  if (diffDays >= 88 && diffDays <= 92) return 'this quarter'

  // For everything else, use the actual date range
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `the period ${fmt(start)} to ${fmt(end)}`
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

  const periodDesc = describePeriod(currentRange.start, currentRange.end)

  let aiSummary: string
  try {
    aiSummary = await callAI(
      `You are a media monitoring analyst. Write a concise 3-5 sentence summary of ${periodDesc}'s media performance for ${client.name}. Report what happened: key changes in mentions and reach, notable stories, sentiment shifts, source distribution. Use specific numbers. Do NOT give advice. Refer to the period as "${periodDesc}".\n\nData:\n${dataSummary}\n\nWrite ONLY the summary paragraph.`,
      600
    )
    console.log(`[Weekly] ✓ AI summary received (${aiSummary.length} chars)`)
  } catch (err) {
    console.log(`[Weekly] AI summary failed: ${err instanceof Error ? err.message : 'unknown'}, using data-driven fallback`)
    // Build a comprehensive data-driven fallback summary from real numbers
    const changeDir = comparison.mentionChangePercent >= 0 ? 'increase' : 'decrease'
    const reachDir = comparison.reachChangePercent >= 0 ? 'increase' : 'decrease'
    const topSources = currentStats.bySource.slice(0, 3)
    const topSourceNames = topSources.map(s => s.name).join(', ')
    const sentTotalCalc = currentStats.positive + currentStats.neutral + currentStats.negative || 1
    const posPct = Math.round((currentStats.positive / sentTotalCalc) * 100)
    const negPct = Math.round((currentStats.negative / sentTotalCalc) * 100)

    // Determine dominant source type
    const sourceRanking = [
      { type: 'web', count: currentStats.web },
      { type: 'TV', count: currentStats.tv },
      { type: 'radio', count: currentStats.radio },
      { type: 'print', count: currentStats.print },
      { type: 'social media', count: currentStats.social },
    ].sort((a, b) => b.count - a.count).filter(s => s.count > 0)
    const dominantSource = sourceRanking[0]
    const dominantPct = dominantSource ? Math.round((dominantSource.count / (currentStats.total || 1)) * 100) : 0

    // Top mention titles for narrative
    const topStories = currentStats.topMentions.slice(0, 2).map(m => `"${m.title.substring(0, 60)}"`).join(' and ')

    const parts: string[] = []
    parts.push(`During ${periodDesc}, ${client.name} saw a ${Math.abs(comparison.mentionChangePercent)}% ${changeDir} in media coverage, with a total of ${currentStats.total} mentions and a reach of ${formatNumber(currentStats.totalReach)}, representing a ${Math.abs(comparison.reachChangePercent)}% ${reachDir} from the previous period.`)

    if (posPct > 50) {
      parts.push(`The majority of the mentions were positive, with ${posPct}% positive sentiment (${currentStats.positive} mentions) and ${negPct}% negative (${currentStats.negative} mentions).`)
    } else if (negPct > 30) {
      parts.push(`Sentiment was mixed, with ${negPct}% of mentions being negative (${currentStats.negative}) compared to ${posPct}% positive (${currentStats.positive}), suggesting areas that may need attention.`)
    } else {
      parts.push(`Sentiment was largely neutral at ${100 - posPct - negPct}%, with ${currentStats.positive} positive and ${currentStats.negative} negative mentions recorded.`)
    }

    if (dominantSource) {
      parts.push(`${dominantSource.type.charAt(0).toUpperCase() + dominantSource.type.slice(1)} coverage dominated at ${dominantPct}% of all mentions.`)
    }

    parts.push(`The top sources driving this coverage were ${topSourceNames || 'various media outlets'}${topSources.length > 0 ? `, with ${topSources[0].name} leading at ${topSources[0].count} mentions and ${formatNumber(topSources[0].reach)} reach` : ''}.`)

    if (topStories) {
      parts.push(`Notable stories included ${topStories}.`)
    }

    aiSummary = parts.join(' ')
  }

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

  const periodDesc = describePeriod(currentRange.start, currentRange.end)

  // Single AI call for all monthly insights (token efficient)
  let parsed: Record<string, unknown>
  try {
    const aiResponse = await callAI(
      `Analyze this media monitoring data and return a JSON object with 4 fields: "headline", "insights", "trends", "recommendations".

headline: One sentence with the percentage change (e.g. "A 51% Decrease in ${client.name} Mentions").
insights: 4-5 observation paragraphs about what happened during ${periodDesc}. Use numbers from the data. Separate with \\n\\n. No advice here.
trends: 4-5 bullet points starting with "•", each on a new line (\\n). Compare to previous period using the numbers.
recommendations: 3-4 action paragraphs. Each is one continuous paragraph. Separate with \\n\\n.

Rules: No markdown. No preambles like "Here are...". No numbered prefixes. Plain text only. Refer to the period as "${periodDesc}".

Data:
${dataSummary}

Return ONLY the JSON object.`,
      3000
    )
    console.log(`[Monthly] AI response received (${aiResponse.length} chars), parsing...`)
    console.log(`[Monthly] AI response preview: ${aiResponse.substring(0, 200)}`)
    parsed = parseJSON(aiResponse)
    console.log(`[Monthly] ✓ Parsed AI response — headline: ${String(parsed.headline || '').length}ch, insights: ${String(parsed.insights || '').length}ch, trends: ${String(parsed.trends || '').length}ch, recs: ${String(parsed.recommendations || '').length}ch`)
  } catch (err) {
    console.log(`[Monthly] First AI call failed: ${err instanceof Error ? err.message : 'unknown'}`)
    // First AI call failed or returned invalid JSON — try individual calls
    try {
      console.log('[Monthly] Trying individual AI calls...')
      const [insightsText, trendsText, recsText] = await Promise.all([
        callAI(`You are a media analyst. Write 4-5 observation paragraphs about this client's media performance during ${periodDesc}. Use specific numbers. Separate paragraphs with blank lines. No advice. No preamble. No markdown. Refer to the period as "${periodDesc}".\n\nData:\n${dataSummary}`, 1200),
        callAI(`Write 4-5 bullet points comparing ${periodDesc} to the previous period. Start each with "•" on its own line. Use specific numbers.\n\nData:\n${dataSummary}`, 600),
        callAI(`Write 3-4 actionable recommendation paragraphs for this client based on their media data during ${periodDesc}. Each recommendation is one continuous paragraph. Separate with blank lines. No preamble. No markdown.\n\nData:\n${dataSummary}`, 800),
      ])
      console.log(`[Monthly] ✓ Individual calls succeeded — insights: ${insightsText.length}ch, trends: ${trendsText.length}ch, recs: ${recsText.length}ch`)
      parsed = {
        headline: `${Math.abs(comparison.mentionChangePercent)}% ${comparison.mentionChangePercent >= 0 ? 'Increase' : 'Decrease'} in ${client.name} Mentions`,
        insights: insightsText,
        trends: trendsText,
        recommendations: recsText,
      }
    } catch (err2) {
      console.log(`[Monthly] Individual AI calls also failed: ${err2 instanceof Error ? err2.message : 'unknown'}`)
      // All AI calls failed — build comprehensive data-driven fallback from real numbers
      console.log('[Monthly] Using data-driven fallback')
      parsed = buildDataDrivenReport(client.name, currentStats, previousStats, comparison, currentRange, previousRange, periodDesc, peakDaysStr)
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const monthName = monthNames[currentRange.start.getMonth()]

  // Validate that all fields have content — only fill truly empty/missing fields from fallback
  const fallback = buildDataDrivenReport(client.name, currentStats, previousStats, comparison, currentRange, previousRange, periodDesc, peakDaysStr)
  const insightsStr = String(parsed.insights || '').trim()
  const trendsStr = String(parsed.trends || '').trim()
  const recsStr = String(parsed.recommendations || '').trim()
  const headlineStr = String(parsed.headline || '').trim()

  if (!insightsStr || insightsStr.length < 10) {
    console.log(`[Monthly] Insights empty/too short (${insightsStr.length}ch), using fallback`)
    parsed.insights = fallback.insights
  }
  if (!trendsStr || trendsStr.length < 10) {
    console.log(`[Monthly] Trends empty/too short (${trendsStr.length}ch), using fallback`)
    parsed.trends = fallback.trends
  }
  if (!recsStr || recsStr.length < 10) {
    console.log(`[Monthly] Recommendations empty/too short (${recsStr.length}ch), using fallback`)
    parsed.recommendations = fallback.recommendations
  }
  if (!headlineStr || headlineStr.length < 5) {
    console.log(`[Monthly] Headline empty/too short (${headlineStr.length}ch), using fallback`)
    parsed.headline = fallback.headline
  }

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

// ─── Data-Driven Fallback Report (when AI is unavailable) ────────────

function buildDataDrivenReport(
  clientName: string,
  current: MentionStats,
  previous: MentionStats,
  comparison: PeriodComparison,
  currentRange: { start: Date; end: Date },
  previousRange: { start: Date; end: Date },
  periodDesc: string,
  peakDaysStr: string
): Record<string, unknown> {
  const changeDir = comparison.mentionChangePercent >= 0 ? 'increase' : 'decrease'
  const reachDir = comparison.reachChangePercent >= 0 ? 'increase' : 'decrease'
  const total = current.total || 1
  const sentTotal = current.positive + current.neutral + current.negative || 1
  const posPct = Math.round((current.positive / sentTotal) * 100)
  const negPct = Math.round((current.negative / sentTotal) * 100)
  const neutPct = Math.round((current.neutral / sentTotal) * 100)

  const topSources = current.bySource.slice(0, 3).map(s => `${s.name} (${s.count} mentions, ${formatNumber(s.reach)} reach)`).join(', ')
  const topSourceNames = current.bySource.slice(0, 3).map(s => s.name).join(', ')

  const sourceTypes = [
    current.web > 0 ? `Web (${Math.round((current.web / total) * 100)}%)` : '',
    current.tv > 0 ? `TV (${Math.round((current.tv / total) * 100)}%)` : '',
    current.radio > 0 ? `Radio (${Math.round((current.radio / total) * 100)}%)` : '',
    current.print > 0 ? `Print (${Math.round((current.print / total) * 100)}%)` : '',
    current.social > 0 ? `Social (${Math.round((current.social / total) * 100)}%)` : '',
  ].filter(Boolean).join(', ')

  // Determine dominant source type
  const sourceRanking = [
    { type: 'Web', count: current.web },
    { type: 'TV', count: current.tv },
    { type: 'Radio', count: current.radio },
    { type: 'Print', count: current.print },
    { type: 'Social Media', count: current.social },
  ].sort((a, b) => b.count - a.count).filter(s => s.count > 0)
  const dominantSource = sourceRanking[0]
  const dominantPct = dominantSource ? Math.round((dominantSource.count / total) * 100) : 0

  // Top mentions for narrative
  const topMentionTitles = current.topMentions.slice(0, 3).map(m => `"${m.title.substring(0, 60)}"`).join(', ')

  // Build insights
  const insights = [
    `During ${periodDesc}, ${clientName} recorded ${current.total} total mentions with a combined reach of ${formatNumber(current.totalReach)}, representing a ${Math.abs(comparison.mentionChangePercent)}% ${changeDir} compared to the previous equivalent period which had ${previous.total} mentions.`,
    `Media coverage was distributed across ${sourceTypes}. ${dominantSource ? `${dominantSource.type} was the dominant channel, accounting for ${dominantPct}% of all mentions with ${dominantSource.count} items.` : ''} The top sources driving coverage were ${topSources || 'various media outlets'}.`,
    `Sentiment analysis reveals that ${posPct}% of mentions were positive (${current.positive}), ${neutPct}% were neutral (${current.neutral}), and ${negPct}% were negative (${current.negative}). ${current.negative > previous.negative ? `Negative mentions increased from ${previous.negative} to ${current.negative}, which warrants attention.` : current.negative < previous.negative ? `Negative mentions decreased from ${previous.negative} to ${current.negative}, indicating improved public perception.` : 'Negative sentiment remained stable compared to the previous period.'}`,
    topMentionTitles ? `Notable stories during this period included ${topMentionTitles}. These stories contributed significantly to the overall media narrative around ${clientName}.` : `Media coverage was spread across multiple outlets without a single dominant story driving the narrative.`,
  ].join('\n\n')

  // Build trends
  const trends = [
    `• Total mentions ${comparison.mentionChangePercent >= 0 ? 'increased' : 'decreased'} by ${Math.abs(comparison.mentionChangePercent)}% from ${previous.total} to ${current.total}`,
    `• Total reach ${comparison.reachChangePercent >= 0 ? 'grew' : 'declined'} by ${Math.abs(comparison.reachChangePercent)}% from ${formatNumber(previous.totalReach)} to ${formatNumber(current.totalReach)}`,
    `• Positive mentions moved from ${previous.positive} to ${current.positive}, while negative mentions went from ${previous.negative} to ${current.negative}`,
    peakDaysStr !== 'no daily data' ? `• Peak activity was recorded on ${peakDaysStr}` : `• Media activity was distributed evenly across the period`,
    sourceRanking.length > 1 ? `• ${sourceRanking[0].type} led with ${sourceRanking[0].count} mentions, followed by ${sourceRanking[1].type} with ${sourceRanking[1].count}` : '',
  ].filter(Boolean).join('\n')

  // Build recommendations based on actual data patterns
  const recommendations: string[] = []

  if (comparison.mentionChangePercent < -20) {
    recommendations.push(`Consider increasing proactive media engagement to reverse the ${Math.abs(comparison.mentionChangePercent)}% decline in mentions. This could include press releases, media briefings, or thought leadership content to maintain visibility across key outlets like ${topSourceNames || 'major publications'}.`)
  } else if (comparison.mentionChangePercent > 20) {
    recommendations.push(`Capitalize on the ${Math.abs(comparison.mentionChangePercent)}% increase in media mentions by amplifying positive stories through owned channels. Share key coverage from ${topSourceNames || 'top sources'} on social media and the company website to extend reach beyond the initial audience.`)
  } else {
    recommendations.push(`With media mentions remaining relatively stable, focus on quality over quantity by developing targeted media campaigns around key themes. Strengthen relationships with top sources like ${topSourceNames || 'key publications'} to ensure consistent and favorable coverage.`)
  }

  if (negPct > 20) {
    recommendations.push(`Address the ${negPct}% negative sentiment by identifying the key drivers of negative coverage and developing a response strategy. Monitor negative stories closely and prepare holding statements for recurring themes to minimize reputational impact.`)
  } else if (posPct > 60) {
    recommendations.push(`Leverage the strong positive sentiment (${posPct}%) by creating case studies and testimonials from favorable coverage. Use positive media mentions in marketing materials and stakeholder communications to reinforce brand credibility.`)
  } else {
    recommendations.push(`Work on improving sentiment by proactively pitching positive stories and thought leadership content. Engage with journalists covering ${clientName} to provide context and data that supports a more favorable narrative.`)
  }

  if (current.social > 0 && current.social < current.web) {
    recommendations.push(`Strengthen social media presence, which currently accounts for only ${Math.round((current.social / total) * 100)}% of mentions compared to ${Math.round((current.web / total) * 100)}% from web sources. Develop a content calendar that amplifies media coverage across social platforms to increase engagement and reach.`)
  } else if (current.social === 0) {
    recommendations.push(`Develop a social media monitoring and engagement strategy to complement traditional media coverage. Social media can significantly amplify reach and provide real-time engagement opportunities with stakeholders and the public.`)
  } else {
    recommendations.push(`Continue investing in the current media mix while exploring opportunities to diversify coverage across underrepresented channels. A balanced presence across ${sourceRanking.map(s => s.type).join(', ')} will ensure broader audience reach and resilience.`)
  }

  return {
    headline: `A ${Math.abs(comparison.mentionChangePercent)}% ${comparison.mentionChangePercent >= 0 ? 'Increase' : 'Decrease'} in ${clientName} Mentions`,
    insights,
    trends,
    recommendations: recommendations.join('\n\n'),
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
