import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SocialPlatform } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Simple YouTube search scraper that works without external dependencies
async function scrapeYouTube(keyword: string): Promise<any[]> {
  const posts: any[] = []
  
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    
    if (!response.ok) {
      console.log('YouTube fetch failed:', response.status)
      return posts
    }
    
    const html = await response.text()
    
    // Extract ytInitialData JSON from the page
    const match = html.match(/var ytInitialData = ({.*?});/)
    if (!match) {
      console.log('Could not find ytInitialData')
      return posts
    }
    
    const data = JSON.parse(match[1])
    
    // Navigate to video results
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || []
    
    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || []
      
      for (const item of items.slice(0, 15)) {
        const video = item?.videoRenderer
        if (!video) continue
        
        const videoId = video.videoId
        if (!videoId) continue
        
        const title = video.title?.runs?.[0]?.text || ''
        const channel = video.ownerText?.runs?.[0]?.text || ''
        const viewsText = video.viewCountText?.simpleText || '0'
        
        // Parse view count
        let views = 0
        const viewsMatch = viewsText.match(/([\d,]+)/)
        if (viewsMatch) {
          views = parseInt(viewsMatch[1].replace(/,/g, '')) || 0
        }
        
        // Get thumbnail
        const thumbnails = video.thumbnail?.thumbnails || []
        const thumbnail = thumbnails[thumbnails.length - 1]?.url || ''
        
        const postUrl = `https://www.youtube.com/watch?v=${videoId}`
        const embedUrl = `https://www.youtube.com/embed/${videoId}`
        const embedHtml = `<iframe width="100%" height="315" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
        
        posts.push({
          platform: 'YOUTUBE' as SocialPlatform,
          postId: videoId,
          content: title,
          authorHandle: '',
          authorName: channel,
          postUrl,
          embedUrl,
          embedHtml,
          mediaUrls: thumbnail ? [thumbnail] : [],
          mediaType: 'video',
          viewsCount: views,
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          hashtags: [],
          mentions: [],
          keywords: keyword,
          postedAt: new Date(),
        })
      }
    }
  } catch (error) {
    console.error('YouTube scrape error:', error)
  }
  
  return posts
}

// POST - Scrape social media directly (without Python crawler)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { keywords: providedKeywords, platforms: providedPlatforms } = body

    const keywords = providedKeywords || ['mining news', 'business news', 'industry update']
    const platforms = providedPlatforms || ['youtube']

    let allPosts: any[] = []

    // Scrape each platform
    for (const platform of platforms) {
      if (platform.toLowerCase() === 'youtube') {
        for (const keyword of keywords.slice(0, 3)) { // Limit to 3 keywords
          const posts = await scrapeYouTube(keyword)
          allPosts.push(...posts)
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      // Add more platforms here as needed
    }

    // Deduplicate by postId
    const seen = new Set<string>()
    const uniquePosts = allPosts.filter(post => {
      const key = `${post.platform}_${post.postId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Save to database
    let savedCount = 0
    for (const post of uniquePosts) {
      try {
        const existing = await prisma.socialPost.findUnique({
          where: {
            platform_postId: {
              platform: post.platform,
              postId: post.postId,
            }
          }
        })

        if (!existing) {
          await prisma.socialPost.create({
            data: {
              platform: post.platform,
              postId: post.postId,
              content: post.content,
              authorHandle: post.authorHandle,
              authorName: post.authorName,
              postUrl: post.postUrl,
              embedUrl: post.embedUrl,
              embedHtml: post.embedHtml,
              mediaUrls: post.mediaUrls,
              mediaType: post.mediaType,
              likesCount: post.likesCount,
              commentsCount: post.commentsCount,
              sharesCount: post.sharesCount,
              viewsCount: post.viewsCount,
              hashtags: post.hashtags,
              mentions: post.mentions,
              keywords: post.keywords,
              postedAt: post.postedAt,
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
      message: `Found ${uniquePosts.length} posts, saved ${savedCount} new posts`,
      postsFound: uniquePosts.length,
      postsSaved: savedCount,
      keywords,
      platforms,
    })

  } catch (error) {
    console.error('Error in social scrape:', error)
    return NextResponse.json(
      { error: 'Failed to scrape social media', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
