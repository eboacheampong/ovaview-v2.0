export interface KPIData {
  totalCoverage: number
  coverageChange: number
  totalReach: string
  reachChange: number
  avgSentiment: number
  sentimentChange: number
  activeClients: number
  clientsChange: number
  todayEntries: number
  webCount: number
  tvCount: number
  radioCount: number
  printCount: number
}

export interface CoverageTrendItem {
  month: string
  print: number
  radio: number
  tv: number
  web: number
  total: number
}

export interface SentimentItem {
  name: string
  value: number
  color: string
}

export interface MediaDistributionItem {
  name: string
  value: number
  color: string
}

export interface IndustryPerformanceItem {
  industry: string
  coverage: number
  sentiment: number
  reach: number
}

export interface PublicationItem {
  name: string
  stories: number
  reach: string
  type: string
}

export interface KeywordItem {
  keyword: string
  count: number
  trend: 'up' | 'down' | 'stable'
}

export interface HourlyEngagementItem {
  hour: string
  engagement: number
}

export interface RegionItem {
  region: string
  reach: number
  percentage: number
}

export interface ClientItem {
  name: string
  mentions: number
  sentiment: number
  reach: string
  change: number
}

export interface JournalistItem {
  name: string
  outlet: string
  articles: number
  sentiment: number
}

export interface AlertItem {
  id: number
  type: string
  message: string
  time: string
  severity: 'critical' | 'warning' | 'success' | 'info'
}

export interface ShareOfVoiceItem {
  name: string
  value: number
  color: string
}

export interface CompetitorComparisonItem {
  metric: string
  client: number
  competitor1?: number
  competitor2?: number
}

export interface AnalyticsData {
  kpiData: KPIData
  coverageTrendData: CoverageTrendItem[]
  sentimentData: SentimentItem[]
  mediaDistributionData: MediaDistributionItem[]
  industryPerformanceData: IndustryPerformanceItem[]
  topPublicationsData: PublicationItem[]
  topKeywordsData: KeywordItem[]
  hourlyEngagementData: HourlyEngagementItem[]
  reachByRegionData: RegionItem[]
  topClientsData: ClientItem[]
  journalistData: JournalistItem[]
  recentAlertsData: AlertItem[]
  lastUpdated: string
}

export interface CompetitorData {
  shareOfVoiceData: ShareOfVoiceItem[]
  competitorComparisonData: CompetitorComparisonItem[]
  clientsDetailedData: Array<{
    id: string
    name: string
    mentions: number
    sentiment: number
    positiveCount: number
    neutralCount: number
    negativeCount: number
    shareOfVoice: number
    reach: number
    reachFormatted: string
    industries: string[]
  }>
  totalStoriesAnalyzed: number
}
