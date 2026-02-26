import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SocialPlatform } from '@prisma/client'

export const dynamic = 'force-dynamic'

// POST - Trigger social media scraping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { clientId, keywords: providedKeywords, platforms: providedPlatforms } = body

    // Get client keywords if clientId provided
    let keywords: string[] = providedKeywords || []
    if (clientId && keywords.length === 0) {
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

    // Default keywords if none provided
    if (keywords.length === 0) {
      keywords = ['news', 'mining', 'industry', 'business']
    }

    const platforms = providedPlatforms || ['youtube']

    // Try to call the crawler API if available
    const crawlerUrl = process.env.CRAWLER_API_URL || 'http://localhost:5000'
    
    try {
      const response = await fetch(`${crawlerUrl}/api/scrape/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          keywords,
          platforms,
          save: false, // We'll save directly to our DB
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const posts = data.posts || []
        
        // Save posts to database
        let savedCount = 0
        for (const post of posts) {
          try {
            // Check if post already exists
            const existing = await prisma.socialPost.findUnique({
              where: {
                platform_postId: {
                  platform: post.platform as SocialPlatform,
                  postId: post.post_id,
                }
              }
            })

            if (!existing) {
              await prisma.socialPost.create({
                data: {
                  platform: post.platform as SocialPlatform,
                  postId: post.post_id,
                  content: post.content,
                  authorHandle: post.author_handle,
                  authorName: post.author_name,
                  postUrl: post.post_url,
                  embedUrl: post.embed_url,
                  embedHtml: post.embed_html,
                  mediaUrls: post.media_urls || [],
                  mediaType: post.media_type,
                  likesCount: post.likes_count || 0,
                  commentsCount: post.comments_count || 0,
                  sharesCount: post.shares_count || 0,
                  viewsCount: post.views_count || 0,
                  hashtags: post.hashtags || [],
                  mentions: post.mentions || [],
                  keywords: post.keywords,
                  postedAt: new Date(post.posted_at || Date.now()),
                }
              })
              savedCount++
            }
          } catch (saveError) {
            console.error('Error saving post:', saveError)
          }
        }

        return NextResponse.json({
          success: true,
          message: `Found ${posts.length} posts, saved ${savedCount} new posts`,
          postsFound: posts.length,
          postsSaved: savedCount,
          keywords,
          platforms,
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Crawler returned error')
      }
    } catch (crawlerError) {
      console.log('Crawler API error:', crawlerError)
      
      // Return helpful message about crawler status
      return NextResponse.json({
        success: false,
        message: 'Crawler service not available. Make sure the crawler is running on port 5000.',
        error: crawlerError instanceof Error ? crawlerError.message : 'Unknown error',
        hint: 'Start the crawler with: cd scrapy_crawler && python api_server.py',
      }, { status: 503 })
    }

  } catch (error) {
    console.error('Error triggering social scrape:', error)
    return NextResponse.json(
      { error: 'Failed to trigger social media scrape' },
      { status: 500 }
    )
  }
}
