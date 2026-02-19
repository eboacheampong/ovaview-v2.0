import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Default settings
const DEFAULT_SETTINGS = {
  scraper: {
    maxArticleAgeDays: 7,
    scraperTimeout: 120,
    maxArticlesPerSource: 150,
    enableRssFeed: true,
    enableSitemap: true,
    enablePageScrape: true,
    scraperApiUrl: process.env.NEXT_PUBLIC_SCRAPER_API || 'http://localhost:5000',
  },
  ai: {
    primaryModel: 'meta-llama/llama-3.1-8b-instruct',
    fallbackModels: [
      'mistralai/mistral-nemo',
      'openai/gpt-oss-20b',
      'openai/gpt-oss-120b',
    ],
    maxTokensSummary: 300,
    maxTokensAnalysis: 800,
    temperatureSummary: 0.5,
    temperatureAnalysis: 0.3,
    maxContentLength: 3000,
  },
}

export async function GET() {
  try {
    // Try to get settings from database
    const settingsRecord = await prisma.systemSetting.findFirst({
      where: { key: 'app_settings' },
    })

    if (settingsRecord) {
      const settings = JSON.parse(settingsRecord.value)
      // Merge with defaults to ensure all keys exist
      return NextResponse.json({
        scraper: { ...DEFAULT_SETTINGS.scraper, ...settings.scraper },
        ai: { ...DEFAULT_SETTINGS.ai, ...settings.ai },
      })
    }

    return NextResponse.json(DEFAULT_SETTINGS)
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    // Return defaults if database fails
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the settings structure
    const settings = {
      scraper: {
        maxArticleAgeDays: Math.max(1, Math.min(30, body.scraper?.maxArticleAgeDays || 7)),
        scraperTimeout: Math.max(30, Math.min(300, body.scraper?.scraperTimeout || 120)),
        maxArticlesPerSource: Math.max(10, Math.min(500, body.scraper?.maxArticlesPerSource || 150)),
        enableRssFeed: body.scraper?.enableRssFeed ?? true,
        enableSitemap: body.scraper?.enableSitemap ?? true,
        enablePageScrape: body.scraper?.enablePageScrape ?? true,
        scraperApiUrl: body.scraper?.scraperApiUrl || DEFAULT_SETTINGS.scraper.scraperApiUrl,
      },
      ai: {
        primaryModel: body.ai?.primaryModel || DEFAULT_SETTINGS.ai.primaryModel,
        fallbackModels: body.ai?.fallbackModels || DEFAULT_SETTINGS.ai.fallbackModels,
        maxTokensSummary: Math.max(100, Math.min(1000, body.ai?.maxTokensSummary || 300)),
        maxTokensAnalysis: Math.max(200, Math.min(2000, body.ai?.maxTokensAnalysis || 800)),
        temperatureSummary: Math.max(0, Math.min(1, body.ai?.temperatureSummary || 0.5)),
        temperatureAnalysis: Math.max(0, Math.min(1, body.ai?.temperatureAnalysis || 0.3)),
        maxContentLength: Math.max(1000, Math.min(10000, body.ai?.maxContentLength || 3000)),
      },
    }

    // Upsert settings in database
    await prisma.systemSetting.upsert({
      where: { key: 'app_settings' },
      create: {
        key: 'app_settings',
        value: JSON.stringify(settings),
      },
      update: {
        value: JSON.stringify(settings),
      },
    })

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Failed to save settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
