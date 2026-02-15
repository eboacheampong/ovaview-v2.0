import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

/**
 * POST /api/daily-insights/scrape
 * Trigger the Scrapy crawler to fetch new articles
 */
export async function POST(request: NextRequest) {
  try {
    // Determine the scrapy crawler directory path
    // process.cwd() = ovaview folder, so go up 1 level to get ovaview-v2
    const scraperPath = path.resolve(process.cwd(), '..', 'scrapy_crawler')
    
    // Run the crawler
    const { stdout, stderr } = await execAsync(`cd "${scraperPath}" && python crawler_runner.py`, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for output
      timeout: 5 * 60 * 1000, // 5 minute timeout
    })

    console.log('Scraper output:', stdout)
    if (stderr) console.warn('Scraper stderr:', stderr)

    return NextResponse.json({
      success: true,
      message: 'Scraper completed successfully',
      output: stdout,
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
