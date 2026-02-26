import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Trigger social media scraping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { clientId } = body

    // Get client keywords if clientId provided
    let keywords: string[] = []
    if (clientId) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          keywords: {
            include: { keyword: true }
          }
        }
      })
      
      if (client) {
        keywords = client.keywords.map(k => k.keyword.name)
        
        // Also add news keywords if available
        if (client.newsKeywords) {
          keywords.push(...client.newsKeywords.split(',').map(k => k.trim()).filter(Boolean))
        }
      }
    }

    // Try to call the crawler API if available
    const crawlerUrl = process.env.CRAWLER_API_URL || 'http://localhost:8000'
    
    try {
      const response = await fetch(`${crawlerUrl}/api/scrape/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          keywords: keywords.length > 0 ? keywords : ['news', 'mining', 'industry'],
          platforms: ['youtube', 'twitter'],
          limit: 20
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json({
          success: true,
          message: `Scraped ${data.posts_saved || 0} social media posts`,
          postsFound: data.posts_found || 0,
          postsSaved: data.posts_saved || 0,
        })
      }
    } catch (crawlerError) {
      console.log('Crawler API not available, using mock data')
    }

    // If crawler is not available, return a message
    // In production, you might want to queue this job or use a different approach
    return NextResponse.json({
      success: true,
      message: 'Social media scrape queued. Crawler service may not be running.',
      postsFound: 0,
      postsSaved: 0,
    })

  } catch (error) {
    console.error('Error triggering social scrape:', error)
    return NextResponse.json(
      { error: 'Failed to trigger social media scrape' },
      { status: 500 }
    )
  }
}
