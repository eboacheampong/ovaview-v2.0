import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SocialPlatform } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for scraping

// Helper to make requests with proper headers
async function fetchWithHeaders(url: string, extraHeaders: Record<string, string> = {}) {
  return fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      ...extraHeaders,
    },
  })
}

// YouTube scraper
async function scrapeYouTube(keyword: string): Promise<any[]> {
  const posts: any[] = []
  
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`
    const response = await fetchWithHeaders(searchUrl)
    
    if (!response.ok) return posts
    
    const html = await response.text()
    const match = html.match(/var ytInitialData = ({.*?});/)
    if (!match) return posts
    
    const data = JSON.parse(match[1])
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || []
    
    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || []
      
      for (const item of items.slice(0, 10)) {
        const video = item?.videoRenderer
        if (!video?.videoId) continue
        
        const videoId = video.videoId
        const title = video.title?.runs?.[0]?.text || ''
        const channel = video.ownerText?.runs?.[0]?.text || ''
        const viewsText = video.viewCountText?.simpleText || '0'
        
        let views = 0
        const viewsMatch = viewsText.match(/([\d,]+)/)
        if (viewsMatch) views = parseInt(viewsMatch[1].replace(/,/g, '')) || 0
        
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
  } catch (error) {
    console.error('YouTube scrape error:', error)
  }
  
  return posts
}

// Twitter/X scraper using Nitter (public Twitter frontend)
async function scrapeTwitter(keyword: string): Promise<any[]> {
  const posts: any[] = []
  
  // List of Nitter instances to try
  const nitterInstances = [
    'https://nitter.net',
    'https://nitter.privacydev.net',
    'https://nitter.poast.org',
  ]
  
  for (const instance of nitterInstances) {
    try {
      const searchUrl = `${instance}/search?f=tweets&q=${encodeURIComponent(keyword)}`
      const response = await fetchWithHeaders(searchUrl)
      
      if (!response.ok) continue
      
      const html = await response.text()
      
      // Parse tweets from Nitter HTML
      const tweetMatches = html.matchAll(/<div class="timeline-item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g)
      
      for (const match of Array.from(tweetMatches).slice(0, 10)) {
        try {
          const tweetHtml = match[1]
          
          // Extract username
          const usernameMatch = tweetHtml.match(/href="\/@([^"]+)"/)
          const username = usernameMatch ? usernameMatch[1] : ''
          
          // Extract display name
          const nameMatch = tweetHtml.match(/<a class="fullname"[^>]*>([^<]+)<\/a>/)
          const displayName = nameMatch ? nameMatch[1].trim() : username
          
          // Extract tweet text
          const textMatch = tweetHtml.match(/<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/)
          const tweetText = textMatch ? textMatch[1].replace(/<[^>]+>/g, '').trim() : ''
          
          // Extract tweet ID from link
          const linkMatch = tweetHtml.match(/href="\/[^/]+\/status\/(\d+)"/)
          const tweetId = linkMatch ? linkMatch[1] : ''
          
          // Extract stats
          const likesMatch = tweetHtml.match(/icon-heart[^>]*><\/span>\s*(\d+)/)
          const retweetsMatch = tweetHtml.match(/icon-retweet[^>]*><\/span>\s*(\d+)/)
          const repliesMatch = tweetHtml.match(/icon-comment[^>]*><\/span>\s*(\d+)/)
          
          if (tweetId && username && tweetText) {
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
              likesCount: parseInt(likesMatch?.[1] || '0'),
              commentsCount: parseInt(repliesMatch?.[1] || '0'),
              sharesCount: parseInt(retweetsMatch?.[1] || '0'),
              hashtags: (tweetText.match(/#\w+/g) || []),
              mentions: (tweetText.match(/@\w+/g) || []),
              keywords: keyword,
              postedAt: new Date(),
            })
          }
        } catch (e) {
          continue
        }
      }
      
      if (posts.length > 0) break // Found tweets, stop trying other instances
    } catch (error) {
      console.error(`Twitter scrape error (${instance}):`, error)
      continue
    }
  }
  
  return posts
}

// TikTok scraper
async function scrapeTikTok(keyword: string): Promise<any[]> {
  const posts: any[] = []
  
  try {
    // TikTok's web search
    const searchUrl = `https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}`
    const response = await fetchWithHeaders(searchUrl)
    
    if (!response.ok) return posts
    
    const html = await response.text()
    
    // Try to find SIGI_STATE data
    const stateMatch = html.match(/<script id="SIGI_STATE"[^>]*>({.*?})<\/script>/)
    if (stateMatch) {
      try {
        const data = JSON.parse(stateMatch[1])
        const items = data?.ItemModule || {}
        
        for (const [videoId, item] of Object.entries(items).slice(0, 10)) {
          const video = item as any
          if (!video?.id) continue
          
          const username = video.author || ''
          const nickname = video.nickname || username
          const desc = video.desc || ''
          const stats = video.stats || {}
          
          const postUrl = `https://www.tiktok.com/@${username}/video/${video.id}`
          
          posts.push({
            platform: 'TIKTOK' as SocialPlatform,
            postId: video.id,
            content: desc.substring(0, 500),
            authorHandle: `@${username}`,
            authorName: nickname,
            postUrl,
            embedUrl: `https://www.tiktok.com/embed/v2/${video.id}`,
            embedHtml: `<iframe src="https://www.tiktok.com/embed/v2/${video.id}" width="100%" height="750" frameborder="0" allowfullscreen></iframe>`,
            mediaUrls: video.cover ? [video.cover] : [],
            mediaType: 'video',
            viewsCount: parseInt(stats.playCount || '0'),
            likesCount: parseInt(stats.diggCount || '0'),
            commentsCount: parseInt(stats.commentCount || '0'),
            sharesCount: parseInt(stats.shareCount || '0'),
            hashtags: (desc.match(/#\w+/g) || []),
            mentions: (desc.match(/@\w+/g) || []),
            keywords: keyword,
            postedAt: new Date(),
          })
        }
      } catch (e) {
        console.error('TikTok parse error:', e)
      }
    }
  } catch (error) {
    console.error('TikTok scrape error:', error)
  }
  
  return posts
}

// Instagram scraper (limited without login)
async function scrapeInstagram(keyword: string): Promise<any[]> {
  const posts: any[] = []
  
  try {
    // Try hashtag search
    const hashtag = keyword.replace(/\s+/g, '').toLowerCase()
    const searchUrl = `https://www.instagram.com/explore/tags/${hashtag}/`
    const response = await fetchWithHeaders(searchUrl)
    
    if (!response.ok) return posts
    
    const html = await response.text()
    
    // Try to find shared data
    const dataMatch = html.match(/window\._sharedData\s*=\s*({.*?});/)
    if (dataMatch) {
      try {
        const data = JSON.parse(dataMatch[1])
        const edges = data?.entry_data?.TagPage?.[0]?.graphql?.hashtag?.edge_hashtag_to_media?.edges || []
        
        for (const edge of edges.slice(0, 10)) {
          const node = edge.node
          if (!node?.shortcode) continue
          
          const postUrl = `https://www.instagram.com/p/${node.shortcode}/`
          
          posts.push({
            platform: 'INSTAGRAM' as SocialPlatform,
            postId: node.shortcode,
            content: node.edge_media_to_caption?.edges?.[0]?.node?.text?.substring(0, 500) || '',
            authorHandle: node.owner?.username ? `@${node.owner.username}` : '',
            authorName: node.owner?.username || '',
            postUrl,
            embedUrl: `${postUrl}embed/`,
            embedHtml: `<iframe src="${postUrl}embed/" width="100%" height="500" frameborder="0" scrolling="no" allowtransparency="true"></iframe>`,
            mediaUrls: node.thumbnail_src ? [node.thumbnail_src] : [],
            mediaType: node.is_video ? 'video' : 'image',
            viewsCount: node.video_view_count || 0,
            likesCount: node.edge_liked_by?.count || 0,
            commentsCount: node.edge_media_to_comment?.count || 0,
            sharesCount: 0,
            hashtags: [`#${hashtag}`],
            mentions: [],
            keywords: keyword,
            postedAt: node.taken_at_timestamp ? new Date(node.taken_at_timestamp * 1000) : new Date(),
          })
        }
      } catch (e) {
        console.error('Instagram parse error:', e)
      }
    }
  } catch (error) {
    console.error('Instagram scrape error:', error)
  }
  
  return posts
}

// Facebook scraper (very limited without login)
async function scrapeFacebook(keyword: string): Promise<any[]> {
  const posts: any[] = []
  
  // Facebook heavily restricts scraping without authentication
  // For production, you'd need to use the Facebook Graph API
  // This is a placeholder that returns empty results
  console.log('Facebook scraping requires Graph API authentication')
  
  return posts
}

// LinkedIn scraper (very limited without login)
async function scrapeLinkedIn(keyword: string): Promise<any[]> {
  const posts: any[] = []
  
  // LinkedIn heavily restricts scraping without authentication
  // For production, you'd need to use the LinkedIn API
  // This is a placeholder that returns empty results
  console.log('LinkedIn scraping requires API authentication')
  
  return posts
}

// POST - Scrape social media directly
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { keywords: providedKeywords, platforms: providedPlatforms } = body

    const keywords = providedKeywords || ['mining news', 'business africa', 'industry update']
    const platforms = providedPlatforms || ['youtube', 'twitter', 'tiktok', 'instagram']

    let allPosts: any[] = []
    const platformResults: Record<string, number> = {}

    // Scrape each platform
    for (const platform of platforms) {
      const platformLower = platform.toLowerCase()
      let platformPosts: any[] = []
      
      for (const keyword of keywords.slice(0, 3)) { // Limit to 3 keywords per platform
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
          
          platformPosts.push(...posts)
          
          // Small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error(`Error scraping ${platform} for "${keyword}":`, error)
        }
      }
      
      platformResults[platform] = platformPosts.length
      allPosts.push(...platformPosts)
    }

    // Deduplicate by platform + postId
    const seen = new Set<string>()
    const uniquePosts = allPosts.filter(post => {
      const key = `${post.platform}_${post.postId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Save to database
    let savedCount = 0
    const errors: string[] = []
    
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
        errors.push(`Failed to save ${post.platform} post: ${saveError}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Found ${uniquePosts.length} posts, saved ${savedCount} new posts`,
      postsFound: uniquePosts.length,
      postsSaved: savedCount,
      platformResults,
      keywords,
      platforms,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    })

  } catch (error) {
    console.error('Error in social scrape:', error)
    return NextResponse.json(
      { error: 'Failed to scrape social media', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
