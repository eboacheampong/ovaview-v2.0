import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SocialPlatform } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Helper to make requests with proper headers
async function fetchWithHeaders(url: string, extraHeaders: Record<string, string> = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        ...extraHeaders,
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return response
  } catch (error) {
    clearTimeout(timeout)
    throw error
  }
}

// ============ YOUTUBE SCRAPER ============
async function scrapeYouTube(keyword: string): Promise<any[]> {
  const posts: any[] = []
  
  try {
    console.log(`[YouTube] Searching for: ${keyword}`)
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}&sp=CAI%253D` // Sort by upload date
    const response = await fetchWithHeaders(searchUrl)
    
    if (!response.ok) {
      console.log(`[YouTube] Failed with status: ${response.status}`)
      return posts
    }
    
    const html = await response.text()
    
    // Try multiple patterns to find video data
    let data: any = null
    
    // Pattern 1: ytInitialData
    const match1 = html.match(/var ytInitialData = ({.*?});/)
    if (match1) {
      try { data = JSON.parse(match1[1]) } catch {}
    }
    
    // Pattern 2: ytInitialData in script tag
    if (!data) {
      const match2 = html.match(/ytInitialData["\s]*[:=]["\s]*({.*?});?\s*<\/script>/)
      if (match2) {
        try { data = JSON.parse(match2[1]) } catch {}
      }
    }
    
    if (!data) {
      console.log('[YouTube] Could not find video data in page')
      return posts
    }
    
    // Navigate to video results
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || []
    
    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || []
      
      for (const item of items.slice(0, 15)) {
        const video = item?.videoRenderer
        if (!video?.videoId) continue
        
        const videoId = video.videoId
        const title = video.title?.runs?.[0]?.text || video.title?.simpleText || ''
        const channel = video.ownerText?.runs?.[0]?.text || video.longBylineText?.runs?.[0]?.text || ''
        
        // Parse view count
        let views = 0
        const viewsText = video.viewCountText?.simpleText || video.viewCountText?.runs?.[0]?.text || '0'
        const viewsMatch = viewsText.match(/([\d,\.]+)\s*(K|M|B)?/i)
        if (viewsMatch) {
          views = parseFloat(viewsMatch[1].replace(/,/g, '')) || 0
          const multiplier = viewsMatch[2]?.toUpperCase()
          if (multiplier === 'K') views *= 1000
          else if (multiplier === 'M') views *= 1000000
          else if (multiplier === 'B') views *= 1000000000
          views = Math.round(views)
        }
        
        const thumbnails = video.thumbnail?.thumbnails || []
        const thumbnail = thumbnails[thumbnails.length - 1]?.url || ''
        
        posts.push({
          platform: 'YOUTUBE' as SocialPlatform,
          postId: videoId,
          content: title,
          authorHandle: '',
          authorName: channel,
          postUrl: `https://www.youtube.com/watch?v=${videoId}`,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          embedHtml: `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`,
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
    
    console.log(`[YouTube] Found ${posts.length} videos for "${keyword}"`)
  } catch (error) {
    console.error('[YouTube] Scrape error:', error)
  }
  
  return posts
}

// ============ TWITTER/X SCRAPER (via Nitter) ============
async function scrapeTwitter(keyword: string): Promise<any[]> {
  const posts: any[] = []
  
  // Nitter instances to try (some may be down)
  const nitterInstances = [
    'https://nitter.privacydev.net',
    'https://nitter.poast.org',
    'https://nitter.net',
    'https://nitter.cz',
  ]
  
  for (const instance of nitterInstances) {
    try {
      console.log(`[Twitter] Trying ${instance} for: ${keyword}`)
      const searchUrl = `${instance}/search?f=tweets&q=${encodeURIComponent(keyword)}`
      const response = await fetchWithHeaders(searchUrl)
      
      if (!response.ok) {
        console.log(`[Twitter] ${instance} returned ${response.status}`)
        continue
      }
      
      const html = await response.text()
      
      // Check if we got a valid page
      if (!html.includes('timeline-item') && !html.includes('tweet-content')) {
        console.log(`[Twitter] ${instance} returned invalid page`)
        continue
      }
      
      // Parse tweets - Nitter uses specific HTML structure
      const tweetRegex = /<div class="timeline-item[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g
      let match
      let count = 0
      
      while ((match = tweetRegex.exec(html)) !== null && count < 10) {
        try {
          const tweetHtml = match[1]
          
          // Extract username
          const usernameMatch = tweetHtml.match(/href="\/([^/"]+)"[^>]*class="[^"]*username/)
          const username = usernameMatch ? usernameMatch[1] : ''
          
          // Extract display name
          const nameMatch = tweetHtml.match(/<a[^>]*class="[^"]*fullname[^"]*"[^>]*>([^<]+)<\/a>/)
          const displayName = nameMatch ? nameMatch[1].trim() : username
          
          // Extract tweet text
          const textMatch = tweetHtml.match(/<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/)
          let tweetText = textMatch ? textMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''
          
          // Extract tweet ID from status link
          const linkMatch = tweetHtml.match(/href="\/[^/]+\/status\/(\d+)"/)
          const tweetId = linkMatch ? linkMatch[1] : ''
          
          // Extract stats
          const statsMatch = tweetHtml.match(/<span class="tweet-stat"[^>]*>[\s\S]*?<\/span>/g) || []
          let likes = 0, retweets = 0, replies = 0
          
          for (const stat of statsMatch) {
            const numMatch = stat.match(/>(\d+)</)
            const num = numMatch ? parseInt(numMatch[1]) : 0
            if (stat.includes('heart') || stat.includes('like')) likes = num
            else if (stat.includes('retweet')) retweets = num
            else if (stat.includes('comment') || stat.includes('reply')) replies = num
          }
          
          if (tweetId && username && tweetText.length > 10) {
            const postUrl = `https://twitter.com/${username}/status/${tweetId}`
            
            posts.push({
              platform: 'TWITTER' as SocialPlatform,
              postId: tweetId,
              content: tweetText.substring(0, 500),
              authorHandle: `@${username}`,
              authorName: displayName,
              postUrl,
              embedUrl: postUrl,
              embedHtml: `<blockquote class="twitter-tweet"><a href="${postUrl}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`,
              mediaUrls: [],
              mediaType: 'text',
              viewsCount: 0,
              likesCount: likes,
              commentsCount: replies,
              sharesCount: retweets,
              hashtags: (tweetText.match(/#\w+/g) || []),
              mentions: (tweetText.match(/@\w+/g) || []),
              keywords: keyword,
              postedAt: new Date(),
            })
            count++
          }
        } catch (e) {
          continue
        }
      }
      
      if (posts.length > 0) {
        console.log(`[Twitter] Found ${posts.length} tweets from ${instance}`)
        break
      }
    } catch (error) {
      console.log(`[Twitter] Error with ${instance}:`, error)
      continue
    }
  }
  
  if (posts.length === 0) {
    console.log('[Twitter] No tweets found from any Nitter instance')
  }
  
  return posts
}

// ============ TIKTOK SCRAPER ============
async function scrapeTikTok(keyword: string): Promise<any[]> {
  const posts: any[] = []
  
  try {
    console.log(`[TikTok] Searching for: ${keyword}`)
    
    // TikTok's web search is heavily protected, try the tag page instead
    const hashtag = keyword.replace(/\s+/g, '').toLowerCase()
    const searchUrl = `https://www.tiktok.com/tag/${hashtag}`
    
    const response = await fetchWithHeaders(searchUrl, {
      'Accept': 'text/html,application/xhtml+xml',
    })
    
    if (!response.ok) {
      console.log(`[TikTok] Failed with status: ${response.status}`)
      return posts
    }
    
    const html = await response.text()
    
    // Try to find SIGI_STATE or __UNIVERSAL_DATA_FOR_REHYDRATION__
    let data: any = null
    
    const sigiMatch = html.match(/<script id="SIGI_STATE"[^>]*>({[\s\S]*?})<\/script>/)
    if (sigiMatch) {
      try { data = JSON.parse(sigiMatch[1]) } catch {}
    }
    
    if (!data) {
      const universalMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>({[\s\S]*?})<\/script>/)
      if (universalMatch) {
        try { data = JSON.parse(universalMatch[1]) } catch {}
      }
    }
    
    if (data) {
      // Try different data structures
      const items = data?.ItemModule || data?.['__DEFAULT_SCOPE__']?.['webapp.video-detail']?.itemInfo?.itemStruct || {}
      
      const itemList = Array.isArray(items) ? items : Object.values(items)
      
      for (const item of itemList.slice(0, 10)) {
        const video = item as any
        if (!video?.id && !video?.video?.id) continue
        
        const videoId = video.id || video.video?.id
        const username = video.author?.uniqueId || video.author || ''
        const nickname = video.author?.nickname || video.nickname || username
        const desc = video.desc || video.description || ''
        const stats = video.stats || video.statistics || {}
        
        const postUrl = `https://www.tiktok.com/@${username}/video/${videoId}`
        
        posts.push({
          platform: 'TIKTOK' as SocialPlatform,
          postId: videoId,
          content: desc.substring(0, 500),
          authorHandle: `@${username}`,
          authorName: nickname,
          postUrl,
          embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
          embedHtml: `<iframe src="https://www.tiktok.com/embed/v2/${videoId}" width="100%" height="750" frameborder="0" allowfullscreen></iframe>`,
          mediaUrls: video.video?.cover ? [video.video.cover] : [],
          mediaType: 'video',
          viewsCount: parseInt(stats.playCount || stats.play_count || '0'),
          likesCount: parseInt(stats.diggCount || stats.likes || '0'),
          commentsCount: parseInt(stats.commentCount || stats.comments || '0'),
          sharesCount: parseInt(stats.shareCount || stats.shares || '0'),
          hashtags: (desc.match(/#\w+/g) || []),
          mentions: (desc.match(/@\w+/g) || []),
          keywords: keyword,
          postedAt: new Date(),
        })
      }
    }
    
    console.log(`[TikTok] Found ${posts.length} videos`)
  } catch (error) {
    console.error('[TikTok] Scrape error:', error)
  }
  
  return posts
}

// ============ INSTAGRAM SCRAPER ============
async function scrapeInstagram(keyword: string): Promise<any[]> {
  const posts: any[] = []
  
  try {
    console.log(`[Instagram] Searching for: ${keyword}`)
    
    // Instagram requires login for most content, try hashtag explore
    const hashtag = keyword.replace(/\s+/g, '').toLowerCase()
    const searchUrl = `https://www.instagram.com/explore/tags/${hashtag}/`
    
    const response = await fetchWithHeaders(searchUrl)
    
    if (!response.ok) {
      console.log(`[Instagram] Failed with status: ${response.status}`)
      return posts
    }
    
    const html = await response.text()
    
    // Try to find shared data
    let data: any = null
    
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({[\s\S]*?});/)
    if (sharedDataMatch) {
      try { data = JSON.parse(sharedDataMatch[1]) } catch {}
    }
    
    // Try additional data script
    if (!data) {
      const additionalMatch = html.match(/window\.__additionalDataLoaded\s*\([^,]+,\s*({[\s\S]*?})\)/)
      if (additionalMatch) {
        try { data = JSON.parse(additionalMatch[1]) } catch {}
      }
    }
    
    if (data) {
      const edges = data?.entry_data?.TagPage?.[0]?.graphql?.hashtag?.edge_hashtag_to_media?.edges ||
                    data?.graphql?.hashtag?.edge_hashtag_to_media?.edges || []
      
      for (const edge of edges.slice(0, 10)) {
        const node = edge.node
        if (!node?.shortcode) continue
        
        const postUrl = `https://www.instagram.com/p/${node.shortcode}/`
        const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || ''
        
        posts.push({
          platform: 'INSTAGRAM' as SocialPlatform,
          postId: node.shortcode,
          content: caption.substring(0, 500),
          authorHandle: node.owner?.username ? `@${node.owner.username}` : '',
          authorName: node.owner?.username || '',
          postUrl,
          embedUrl: `${postUrl}embed/`,
          embedHtml: `<iframe src="${postUrl}embed/" width="100%" height="500" frameborder="0" scrolling="no" allowtransparency="true"></iframe>`,
          mediaUrls: node.thumbnail_src ? [node.thumbnail_src] : [],
          mediaType: node.is_video ? 'video' : 'image',
          viewsCount: node.video_view_count || 0,
          likesCount: node.edge_liked_by?.count || node.edge_media_preview_like?.count || 0,
          commentsCount: node.edge_media_to_comment?.count || 0,
          sharesCount: 0,
          hashtags: [`#${hashtag}`],
          mentions: [],
          keywords: keyword,
          postedAt: node.taken_at_timestamp ? new Date(node.taken_at_timestamp * 1000) : new Date(),
        })
      }
    }
    
    console.log(`[Instagram] Found ${posts.length} posts`)
  } catch (error) {
    console.error('[Instagram] Scrape error:', error)
  }
  
  return posts
}

// ============ FACEBOOK SCRAPER ============
async function scrapeFacebook(keyword: string): Promise<any[]> {
  // Facebook requires authentication for search
  // For production, use Facebook Graph API
  console.log('[Facebook] Requires Graph API authentication - skipping')
  return []
}

// ============ LINKEDIN SCRAPER ============
async function scrapeLinkedIn(keyword: string): Promise<any[]> {
  // LinkedIn requires authentication
  // For production, use LinkedIn API
  console.log('[LinkedIn] Requires API authentication - skipping')
  return []
}

// ============ MAIN SCRAPE ENDPOINT ============
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { keywords: providedKeywords, platforms: providedPlatforms } = body

    // Default keywords if none provided
    const keywords = providedKeywords?.length > 0 
      ? providedKeywords 
      : ['mining news', 'business africa', 'ghana news', 'industry update']
    
    // Default to all supported platforms
    const platforms = providedPlatforms?.length > 0 
      ? providedPlatforms 
      : ['youtube', 'twitter', 'tiktok', 'instagram']

    console.log(`[Social Scraper] Starting scrape for keywords: ${keywords.join(', ')}`)
    console.log(`[Social Scraper] Platforms: ${platforms.join(', ')}`)

    let allPosts: any[] = []
    const platformResults: Record<string, { found: number; errors: string[] }> = {}

    // Scrape each platform
    for (const platform of platforms) {
      const platformLower = platform.toLowerCase()
      platformResults[platformLower] = { found: 0, errors: [] }
      
      for (const keyword of keywords.slice(0, 3)) {
        try {
          let posts: any[] = []
          
          switch (platformLower) {
            case 'youtube':
              posts = await scrapeYouTube(keyword)
              break
            case 'twitter':
            case 'x':
              posts = await scrapeTwitter(keyword)
              break
            case 'tiktok':
              posts = await scrapeTikTok(keyword)
              break
            case 'instagram':
              posts = await scrapeInstagram(keyword)
              break
            case 'facebook':
              posts = await scrapeFacebook(keyword)
              break
            case 'linkedin':
              posts = await scrapeLinkedIn(keyword)
              break
          }
          
          platformResults[platformLower].found += posts.length
          allPosts.push(...posts)
          
          // Delay between requests
          await new Promise(resolve => setTimeout(resolve, 800))
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error'
          platformResults[platformLower].errors.push(`${keyword}: ${errMsg}`)
          console.error(`[${platform}] Error for "${keyword}":`, error)
        }
      }
    }

    // Deduplicate
    const seen = new Set<string>()
    const uniquePosts = allPosts.filter(post => {
      const key = `${post.platform}_${post.postId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    console.log(`[Social Scraper] Total unique posts: ${uniquePosts.length}`)

    // Save to database
    let savedCount = 0
    let duplicateCount = 0
    
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

        if (existing) {
          duplicateCount++
          continue
        }

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
            mediaUrls: post.mediaUrls || [],
            mediaType: post.mediaType,
            likesCount: post.likesCount || 0,
            commentsCount: post.commentsCount || 0,
            sharesCount: post.sharesCount || 0,
            viewsCount: post.viewsCount || 0,
            hashtags: post.hashtags || [],
            mentions: post.mentions || [],
            keywords: post.keywords,
            postedAt: post.postedAt,
          }
        })
        savedCount++
      } catch (saveError) {
        console.error('[Social Scraper] Save error:', saveError)
      }
    }

    // Build summary
    const platformSummary = Object.entries(platformResults)
      .map(([p, r]) => `${p}: ${r.found}`)
      .join(', ')

    const message = `Found ${uniquePosts.length} posts (${platformSummary}), saved ${savedCount} new, ${duplicateCount} duplicates`
    console.log(`[Social Scraper] ${message}`)

    return NextResponse.json({
      success: true,
      message,
      postsFound: uniquePosts.length,
      postsSaved: savedCount,
      duplicates: duplicateCount,
      platformResults,
      keywords,
      platforms,
    })

  } catch (error) {
    console.error('[Social Scraper] Fatal error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to scrape social media', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check status
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    supportedPlatforms: ['youtube', 'twitter', 'tiktok', 'instagram'],
    limitedPlatforms: ['facebook', 'linkedin'],
    note: 'Facebook and LinkedIn require API authentication',
  })
}
