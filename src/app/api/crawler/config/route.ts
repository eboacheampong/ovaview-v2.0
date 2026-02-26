import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Default crawler configuration
const DEFAULT_CONFIG = {
  // General settings
  'crawler.enabled': { value: 'true', description: 'Enable/disable the crawler', category: 'general' },
  'crawler.interval': { value: '60', description: 'Crawl interval in minutes', category: 'general' },
  'crawler.maxArticleAge': { value: '7', description: 'Maximum article age in days', category: 'general' },
  
  // Performance settings
  'crawler.concurrentRequests': { value: '4', description: 'Number of concurrent requests', category: 'performance' },
  'crawler.downloadDelay': { value: '2', description: 'Delay between requests in seconds', category: 'performance' },
  'crawler.timeout': { value: '30', description: 'Request timeout in seconds', category: 'performance' },
  'crawler.retryCount': { value: '3', description: 'Number of retries on failure', category: 'performance' },
  
  // Social media settings
  'social.twitter.enabled': { value: 'true', description: 'Enable Twitter/X crawling', category: 'social' },
  'social.facebook.enabled': { value: 'true', description: 'Enable Facebook crawling', category: 'social' },
  'social.linkedin.enabled': { value: 'true', description: 'Enable LinkedIn crawling', category: 'social' },
  'social.instagram.enabled': { value: 'false', description: 'Enable Instagram crawling', category: 'social' },
  'social.youtube.enabled': { value: 'true', description: 'Enable YouTube crawling', category: 'social' },
  
  // Notification settings
  'notifications.onSuccess': { value: 'false', description: 'Notify on successful crawl', category: 'notifications' },
  'notifications.onError': { value: 'true', description: 'Notify on crawl errors', category: 'notifications' },
  'notifications.email': { value: '', description: 'Email for notifications', category: 'notifications' },
}

// GET crawler configuration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // Get all config from database
    const dbConfig = await prisma.crawlerConfig.findMany({
      where: category ? { category } : undefined,
      orderBy: { key: 'asc' },
    })

    // Merge with defaults
    const configMap = new Map(dbConfig.map(c => [c.key, c]))
    const config: any[] = []

    for (const [key, defaults] of Object.entries(DEFAULT_CONFIG)) {
      if (category && defaults.category !== category) continue
      
      const dbValue = configMap.get(key)
      config.push({
        key,
        value: dbValue?.value ?? defaults.value,
        description: defaults.description,
        category: defaults.category,
        id: dbValue?.id,
      })
    }

    // Add any custom config not in defaults
    for (const item of dbConfig) {
      if (!DEFAULT_CONFIG[item.key as keyof typeof DEFAULT_CONFIG]) {
        config.push(item)
      }
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Error fetching crawler config:', error)
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

// POST/PUT update crawler configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { config } = body

    if (!config || !Array.isArray(config)) {
      return NextResponse.json({ error: 'config array is required' }, { status: 400 })
    }

    const results = []
    for (const item of config) {
      const { key, value, description, category } = item
      
      if (!key) continue

      const result = await prisma.crawlerConfig.upsert({
        where: { key },
        update: { value, description, category },
        create: { key, value, description, category: category || 'general' },
      })
      results.push(result)
    }

    return NextResponse.json({ success: true, updated: results.length })
  } catch (error) {
    console.error('Error updating crawler config:', error)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}
