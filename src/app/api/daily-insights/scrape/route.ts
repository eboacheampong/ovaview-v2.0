import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { prisma } from '@/lib/prisma'

const execAsync = promisify(exec)

/**
 * POST /api/daily-insights/scrape
 * Trigger the Scrapy crawler to fetch new articles and save them to the database
 */
export async function POST(request: NextRequest) {
  try {
    // Get optional clientId from request body
    const body = await request.json().catch(() => ({}))
    const clientId = body?.clientId || null

    // Determine the scrapy crawler directory path
    // process.cwd() = ovaview folder, so go up 1 level to get ovaview-v2
    const scraperPath = path.resolve(process.cwd(), '..', 'scrapy_crawler')
    
    // Use full path to Python executable to ensure it's found
    const pythonPath = 'C:\\Users\\lenovo\\AppData\\Local\\Programs\\Python\\Python313\\python.exe'
    
    console.log('Starting scraper...')
    
    // Run the crawler
    const { stdout, stderr } = await execAsync(`cd "${scraperPath}" && "${pythonPath}" crawler_runner.py`, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for output
      timeout: 5 * 60 * 1000, // 5 minute timeout
    })

    console.log('Scraper output:', stdout)
    if (stderr) console.warn('Scraper stderr:', stderr)

    // Parse JSON articles from output (if any)
    let articlesData: any[] = []
    try {
      // Try to extract JSON between markers
      const jsonMatch = stdout.match(/\[JSON_START\]([\s\S]*?)\[JSON_END\]/)
      if (jsonMatch && jsonMatch[1]) {
        articlesData = JSON.parse(jsonMatch[1])
      }
    } catch (e) {
      console.warn('Could not parse JSON articles from output:', e)
    }

    let savedCount = 0
    let duplicateCount = 0
    const errors: string[] = []

    // Save articles to database
    if (articlesData.length > 0) {
      for (const article of articlesData) {
        try {
          const { title, url, description, source, industry, scraped_at } = article

          if (!title || !url) {
            errors.push(`Skipping article: missing title or url`)
            continue
          }

          // Check if article already exists
          const existing = await prisma.dailyInsight.findFirst({
            where: {
              url,
              clientId,
            },
          })

          if (existing) {
            duplicateCount++
            continue
          }

          // Save new article
          await prisma.dailyInsight.create({
            data: {
              title: title.substring(0, 255),
              url,
              description: description ? description.substring(0, 1000) : '',
              source: source || '',
              industry: industry || 'general',
              clientId,
              status: 'pending',
              scrapedAt: scraped_at ? new Date(scraped_at) : new Date(),
            },
          })

          savedCount++
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.error('Error saving article:', errorMsg)
          errors.push(`Failed to save article: ${errorMsg}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Scraper completed successfully. Saved ${savedCount} articles, skipped ${duplicateCount} duplicates.`,
      stats: {
        scraped: articlesData.length,
        saved: savedCount,
        duplicates: duplicateCount,
        errors: errors.length > 0 ? errors : undefined,
      },
      output: stdout.substring(0, 500), // Return first 500 chars of output
    })
  } catch (error) {
    console.error('Error running scraper:', error)
    
    // Check if it's a timeout
    if (error instanceof Error && error.message.includes('ETIMEDOUT')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scraper timeout - operation took too long',
          message: 'The scraper is still running. Check server logs for progress.',
        },
        { status: 504 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run scraper',
        message: 'Make sure Python and dependencies are installed: pip install -r scrapy_crawler/requirements.txt',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/daily-insights/scrape/status
 * Get the status of the last scrape
 */
export async function GET(request: NextRequest) {
  try {
    // This is a simple endpoint that could be extended to track scraper status
    // For now, it returns instructions
    return NextResponse.json({
      message: 'Scraper endpoint is active',
      instructions: [
        'POST to this endpoint to trigger a scrape',
        'Make sure Python and dependencies are installed',
        'Configuration: edit scrapy_crawler/news_scraper/settings.py',
      ],
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}
