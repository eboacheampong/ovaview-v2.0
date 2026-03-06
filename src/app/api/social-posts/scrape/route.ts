import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SocialPlatform } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// 24-hour cutoff — only accept posts from the last 24 hours
const HOURS_CUTOFF = 24

function getCutoffDate(): Date {
  return new Date(Date.now() - HOURS_CUTOFF * 60 * 60 * 1000)
}

// Helper to make requests with browser-like headers
async function fetchPage(url: string, extra: Record<string, string> = {}): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        ...extra,
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return res
  } catch (e) {
    clearTimeout(timeout)
    throw e
  }
}

function isRecent(date: Date | null): boolean {
  if (!date) return false
  return date >= getCutoffDate()
}

// ============ YOUTUBE — RSS feed approach (reliable, no API key) ============
async function scrapeYouTube(keyword: string): Promise<any[]> {
  const posts: any[] = []
  try {
    console.log(`[YouTube] Searching for: ${keyword}`)

    // Strategy 1: YouTube RSS search via Invidious instances (public, no auth)
    const invidiousInstances = [
      'https://vid.puffyan.us',
      'https://invidious.fdn.fr',
      'https://y.com.sb',
      'https://invidious.nerdvpn.de',
    ]

    let found = false
    for (const instance of invidiousInstances) {
      if (found) break
      try {
        const apiUrl = `${instance}/api/v1/search?q=${encodeURIComponent(keyword)}&sort_by=upload_date&date=today&type=video`
        const res = await fetchPage(apiUrl, { 'Accept': 'application/json' })
        if (!res.ok) continue
        const data = await res.json()
        if (!Array.isArray(data) || data.length === 0) continue

        for (const video of data.slice(0, 10)) {
          if (!video.videoId) continue
          const publishedDate = video.published ? new Date(video.published * 1000) : null
          if (publishedDate && !isRecent(publishedDate)) continue

          posts.push({
            platform: 'YOUTUBE' as SocialPlatform,
            postId: video.videoId,
            content: (video.title || '').substring(0, 500),
            summary: (video.description || '').substring(0, 300),
            authorHandle: video.authorId || '',
            authorName: video.author || '',
            postUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
            embedUrl: `https://www.youtube.com/embed/${video.videoId}`,
            embedHtml: `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${video.videoId}" frameborder="0" allowfullscreen></iframe>`,
            mediaUrls: video.videoThumbnails?.[0]?.url ? [video.videoThumbnails[0].url] : [],
            mediaType: 'video',
            viewsCount: video.viewCount || 0,
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            hashtags: [],
            mentions: [],
            keywords: keyword,
            postedAt: publishedDate || new Date(),
          })
        }
        if (posts.length > 0) found = true
        console.log(`[YouTube] Invidious (${instance}) found ${posts.length} recent videos`)
      } catch { continue }
    }

    // Strategy 2: Fallback — scrape YouTube directly
    if (posts.length === 0) {
      // sp=EgIIAQ== means "Upload date: Today"
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}&sp=EgIIAQ%253D%253D`
      const response = await fetchPage(searchUrl)
      if (response.ok) {
        const html = await response.text()
        let data: any = null
        const match = html.match(/var ytInitialData = ({.*?});/)
        if (match) { try { data = JSON.parse(match[1]) } catch {} }

        if (data) {
          const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || []
          for (const section of contents) {
            const items = section?.itemSectionRenderer?.contents || []
            for (const item of items.slice(0, 10)) {
              const video = item?.videoRenderer
              if (!video?.videoId) continue
              const title = video.title?.runs?.[0]?.text || ''
              const channel = video.ownerText?.runs?.[0]?.text || ''
              let views = 0
              const viewsText = video.viewCountText?.simpleText || '0'
              const vm = viewsText.match(/([\d,\.]+)/)
              if (vm) views = parseInt(vm[1].replace(/,/g, '')) || 0
              const thumbnails = video.thumbnail?.thumbnails || []
              const thumb = thumbnails[thumbnails.length - 1]?.url || ''

              posts.push({
                platform: 'YOUTUBE' as SocialPlatform,
                postId: video.videoId,
                content: title.substring(0, 500),
                summary: '',
                authorHandle: '',
                authorName: channel,
                postUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
                embedUrl: `https://www.youtube.com/embed/${video.videoId}`,
                embedHtml: `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${video.videoId}" frameborder="0" allowfullscreen></iframe>`,
                mediaUrls: thumb ? [thumb] : [],
                mediaType: 'video',
                viewsCount: views,
                likesCount: 0,
                commentsCount: 0,
                sharesCount: 0,
                hashtags: [],
                mentions: [],
                keywords: keyword,
                postedAt: new Date(), // YouTube direct doesn't give exact date, but filter is "today"
              })
            }
          }
        }
      }
    }

    console.log(`[YouTube] Total: ${posts.length} recent videos for "${keyword}"`)
  } catch (error) {
    console.error('[YouTube] Scrape error:', error)
  }
  return posts
}


// ============ TWITTER/X — Multiple fallback strategies ============
async function scrapeTwitter(keyword: string): Promise<any[]> {
  const posts: any[] = []
  try {
    console.log(`[Twitter] Searching for: ${keyword}`)

    // Strategy 1: Nitter instances that are still alive (some community forks survive)
    const nitterInstances = [
      'https://nitter.privacydev.net',
      'https://nitter.poast.org',
      'https://nitter.woodland.cafe',
    ]

    for (const instance of nitterInstances) {
      if (posts.length > 0) break
      try {
        const url = `${instance}/search?f=tweets&q=${encodeURIComponent(keyword)}&since=${formatDateParam(getCutoffDate())}`
        const res = await fetchPage(url)
        if (!res.ok) continue
        const html = await res.text()

        // Parse Nitter HTML for tweet cards
        const tweetBlocks = html.split('class="timeline-item"').slice(1, 11)
        for (const block of tweetBlocks) {
          const linkMatch = block.match(/href="\/([^/]+)\/status\/(\d+)"/)
          if (!linkMatch) continue
          const username = linkMatch[1]
          const tweetId = linkMatch[2]

          const contentMatch = block.match(/class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/)
          const content = contentMatch
            ? contentMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
            : ''
          if (content.length < 5) continue

          const nameMatch = block.match(/class="fullname"[^>]*>([^<]+)</)
          const dateMatch = block.match(/title="([^"]+)"/)
          let postedAt = new Date()
          if (dateMatch) {
            try { const d = new Date(dateMatch[1]); if (!isNaN(d.getTime())) postedAt = d } catch {}
          }
          if (!isRecent(postedAt)) continue

          posts.push({
            platform: 'TWITTER' as SocialPlatform,
            postId: tweetId,
            content: content.substring(0, 500),
            summary: '',
            authorHandle: `@${username}`,
            authorName: nameMatch ? nameMatch[1].trim() : username,
            postUrl: `https://x.com/${username}/status/${tweetId}`,
            embedUrl: `https://x.com/${username}/status/${tweetId}`,
            embedHtml: `<blockquote class="twitter-tweet"><a href="https://x.com/${username}/status/${tweetId}">Tweet</a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`,
            mediaUrls: [],
            mediaType: 'text',
            viewsCount: 0,
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            hashtags: (content.match(/#\w+/g) || []),
            mentions: (content.match(/@\w+/g) || []),
            keywords: keyword,
            postedAt,
          })
        }
        if (posts.length > 0) console.log(`[Twitter] Nitter (${instance}) found ${posts.length} tweets`)
      } catch { continue }
    }

    // Strategy 2: RSS Bridge
    if (posts.length === 0) {
      try {
        const bridgeUrl = `https://rss-bridge.org/bridge01/?action=display&bridge=TwitterBridge&context=By+keyword&q=${encodeURIComponent(keyword)}&format=Json`
        const res = await fetchPage(bridgeUrl, { 'Accept': 'application/json' })
        if (res.ok) {
          const data = await res.json()
          for (const item of (data.items || []).slice(0, 10)) {
            const content = (item.content_text || item.title || '').trim()
            if (content.length < 5) continue
            const urlMatch = (item.url || '').match(/status\/(\d+)/)
            const tweetId = urlMatch ? urlMatch[1] : `rss_${Date.now()}_${posts.length}`
            let postedAt = new Date()
            if (item.date_published) { try { postedAt = new Date(item.date_published) } catch {} }
            if (!isRecent(postedAt)) continue

            posts.push({
              platform: 'TWITTER' as SocialPlatform,
              postId: tweetId,
              content: content.substring(0, 500),
              summary: '',
              authorHandle: item.author?.name ? `@${item.author.name}` : '',
              authorName: item.author?.name || '',
              postUrl: item.url || `https://x.com/search?q=${encodeURIComponent(keyword)}`,
              embedUrl: item.url || '',
              embedHtml: `<blockquote class="twitter-tweet"><a href="${item.url || '#'}">Tweet</a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`,
              mediaUrls: [],
              mediaType: 'text',
              viewsCount: 0,
              likesCount: 0,
              commentsCount: 0,
              sharesCount: 0,
              hashtags: (content.match(/#\w+/g) || []),
              mentions: (content.match(/@\w+/g) || []),
              keywords: keyword,
              postedAt,
            })
          }
          if (posts.length > 0) console.log(`[Twitter] RSS Bridge found ${posts.length} tweets`)
        }
      } catch { /* RSS bridge failed */ }
    }

    // Strategy 3: Bing search for recent tweets (more lenient than Google)
    if (posts.length === 0) {
      try {
        const bingUrl = `https://www.bing.com/search?q=site:x.com+OR+site:twitter.com+${encodeURIComponent(keyword)}&filters=ex1%3a"ez1"&count=10`
        const res = await fetchPage(bingUrl)
        if (res.ok) {
          const html = await res.text()
          const results = parseBingResults(html, keyword, 'TWITTER', /(?:x\.com|twitter\.com)\/(\w+)\/status\/(\d+)/)
          posts.push(...results.filter(p => isRecent(new Date(p.postedAt))))
          if (posts.length > 0) console.log(`[Twitter] Bing found ${posts.length} tweets`)
        }
      } catch { /* Bing failed */ }
    }

    console.log(`[Twitter] Total: ${posts.length} recent tweets for "${keyword}"`)
  } catch (error) {
    console.error('[Twitter] Scrape error:', error)
  }
  return posts
}


// ============ TIKTOK — Bing search approach ============
async function scrapeTikTok(keyword: string): Promise<any[]> {
  const posts: any[] = []
  try {
    console.log(`[TikTok] Searching for: ${keyword}`)

    // TikTok blocks server-side scraping heavily. Use Bing search.
    const bingUrl = `https://www.bing.com/search?q=site:tiktok.com+${encodeURIComponent(keyword)}&filters=ex1%3a"ez1"&count=10`
    const res = await fetchPage(bingUrl)
    if (res.ok) {
      const html = await res.text()
      const urlRegex = /href="(https?:\/\/(?:www\.)?tiktok\.com\/@[^"]+\/video\/\d+)"/g
      const titleRegex = /<h2[^>]*>([\s\S]*?)<\/h2>/g
      const urls: string[] = []
      let m
      while ((m = urlRegex.exec(html)) !== null) {
        const u = m[1].split('&')[0].split('?')[0]
        if (!urls.includes(u)) urls.push(u)
      }
      const titles: string[] = []
      while ((m = titleRegex.exec(html)) !== null) {
        titles.push(m[1].replace(/<[^>]+>/g, '').trim())
      }

      for (let i = 0; i < Math.min(urls.length, 8); i++) {
        const url = urls[i]
        const videoMatch = url.match(/video\/(\d+)/)
        const userMatch = url.match(/@([^/]+)/)
        if (!videoMatch) continue

        posts.push({
          platform: 'TIKTOK' as SocialPlatform,
          postId: videoMatch[1],
          content: (titles[i] || `TikTok about ${keyword}`).substring(0, 500),
          summary: '',
          authorHandle: userMatch ? `@${userMatch[1]}` : '',
          authorName: userMatch ? userMatch[1] : '',
          postUrl: url,
          embedUrl: `https://www.tiktok.com/embed/v2/${videoMatch[1]}`,
          embedHtml: `<iframe src="https://www.tiktok.com/embed/v2/${videoMatch[1]}" width="100%" height="750" frameborder="0" allowfullscreen></iframe>`,
          mediaUrls: [],
          mediaType: 'video',
          viewsCount: 0,
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          hashtags: [],
          mentions: [],
          keywords: keyword,
          postedAt: new Date(), // Bing "today" filter applied
        })
      }
    }

    console.log(`[TikTok] Found ${posts.length} videos for "${keyword}"`)
  } catch (error) {
    console.error('[TikTok] Scrape error:', error)
  }
  return posts
}

// ============ INSTAGRAM — Bing search approach ============
async function scrapeInstagram(keyword: string): Promise<any[]> {
  const posts: any[] = []
  try {
    console.log(`[Instagram] Searching for: ${keyword}`)

    const bingUrl = `https://www.bing.com/search?q=site:instagram.com+${encodeURIComponent(keyword)}&filters=ex1%3a"ez1"&count=10`
    const res = await fetchPage(bingUrl)
    if (res.ok) {
      const html = await res.text()
      const urlRegex = /href="(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/[A-Za-z0-9_-]+)"/g
      const titleRegex = /<h2[^>]*>([\s\S]*?)<\/h2>/g
      const urls: string[] = []
      let m
      while ((m = urlRegex.exec(html)) !== null) {
        const u = m[1].split('?')[0]
        if (!urls.includes(u)) urls.push(u)
      }
      const titles: string[] = []
      while ((m = titleRegex.exec(html)) !== null) {
        titles.push(m[1].replace(/<[^>]+>/g, '').trim())
      }

      for (let i = 0; i < Math.min(urls.length, 8); i++) {
        const url = urls[i]
        const codeMatch = url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/)
        if (!codeMatch) continue

        // Try to extract author from title (often "Author on Instagram: ...")
        const title = titles[i] || ''
        const authorMatch = title.match(/^(.+?)\s+on\s+Instagram/i)
        const authorName = authorMatch ? authorMatch[1].trim() : ''

        posts.push({
          platform: 'INSTAGRAM' as SocialPlatform,
          postId: codeMatch[1],
          content: (title || `Instagram post about ${keyword}`).substring(0, 500),
          summary: '',
          authorHandle: authorName ? `@${authorName.toLowerCase().replace(/\s+/g, '')}` : '',
          authorName,
          postUrl: url + '/',
          embedUrl: url + '/embed/',
          embedHtml: `<iframe src="${url}/embed/" width="100%" height="500" frameborder="0" scrolling="no" allowtransparency="true"></iframe>`,
          mediaUrls: [],
          mediaType: url.includes('/reel/') ? 'video' : 'image',
          viewsCount: 0,
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          hashtags: (title.match(/#\w+/g) || []),
          mentions: [],
          keywords: keyword,
          postedAt: new Date(),
        })
      }
    }

    console.log(`[Instagram] Found ${posts.length} posts for "${keyword}"`)
  } catch (error) {
    console.error('[Instagram] Scrape error:', error)
  }
  return posts
}


// ============ LINKEDIN — Bing search approach ============
async function scrapeLinkedIn(keyword: string): Promise<any[]> {
  const posts: any[] = []
  try {
    console.log(`[LinkedIn] Searching for: ${keyword}`)

    const bingUrl = `https://www.bing.com/search?q=site:linkedin.com/posts+${encodeURIComponent(keyword)}&filters=ex1%3a"ez1"&count=10`
    const res = await fetchPage(bingUrl)
    if (res.ok) {
      const html = await res.text()
      const results = parseBingResults(html, keyword, 'LINKEDIN', /linkedin\.com\/posts\/([^_/\s"]+)/)
      posts.push(...results)
    }

    console.log(`[LinkedIn] Found ${posts.length} posts for "${keyword}"`)
  } catch (error) {
    console.error('[LinkedIn] Scrape error:', error)
  }
  return posts
}

// ============ FACEBOOK — Bing search approach ============
async function scrapeFacebook(keyword: string): Promise<any[]> {
  const posts: any[] = []
  try {
    console.log(`[Facebook] Searching for: ${keyword}`)

    const bingUrl = `https://www.bing.com/search?q=site:facebook.com+${encodeURIComponent(keyword)}&filters=ex1%3a"ez1"&count=10`
    const res = await fetchPage(bingUrl)
    if (res.ok) {
      const html = await res.text()
      const results = parseBingResults(html, keyword, 'FACEBOOK', /facebook\.com\/([^/\s"]+)/)
      posts.push(...results)
    }

    console.log(`[Facebook] Found ${posts.length} posts for "${keyword}"`)
  } catch (error) {
    console.error('[Facebook] Scrape error:', error)
  }
  return posts
}

// ============ BING RESULT PARSER (shared) ============
function parseBingResults(
  html: string,
  keyword: string,
  platform: string,
  authorRegex: RegExp
): any[] {
  const posts: any[] = []

  // Bing wraps results in <li class="b_algo">
  const blocks = html.split('class="b_algo"').slice(1, 11)

  for (const block of blocks) {
    // Extract URL
    const urlMatch = block.match(/href="(https?:\/\/[^"]+)"/)
    if (!urlMatch) continue
    const url = urlMatch[1].split('&')[0].split('?')[0]

    // Skip non-post URLs
    if (platform === 'FACEBOOK' && !url.includes('/posts/') && !url.includes('/permalink/')) continue

    // Extract title
    const titleMatch = block.match(/<a[^>]*>([\s\S]*?)<\/a>/)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : ''

    // Extract snippet
    const snippetMatch = block.match(/class="b_caption"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/)
    const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : ''

    const content = title || snippet || `${platform} post about ${keyword}`
    if (content.length < 5) continue

    // Extract author from URL
    const aMatch = url.match(authorRegex)
    const authorRaw = aMatch ? aMatch[1] : ''
    const authorName = authorRaw.replace(/[-_.]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    const postId = `${platform.toLowerCase().substring(0, 2)}_${Buffer.from(url).toString('base64').substring(0, 20)}`

    let embedHtml = ''
    if (platform === 'FACEBOOK') {
      embedHtml = `<iframe src="https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500" width="100%" height="400" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true"></iframe>`
    } else if (platform === 'LINKEDIN') {
      embedHtml = `<iframe src="${url}" width="100%" height="400" frameborder="0" allowfullscreen></iframe>`
    }

    posts.push({
      platform: platform as SocialPlatform,
      postId,
      content: content.substring(0, 500),
      summary: snippet.substring(0, 300),
      authorHandle: authorRaw,
      authorName,
      postUrl: url,
      embedUrl: url,
      embedHtml,
      mediaUrls: [],
      mediaType: 'text',
      viewsCount: 0,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      hashtags: (content.match(/#\w+/g) || []),
      mentions: [],
      keywords: keyword,
      postedAt: new Date(), // Bing "today" filter applied
    })
  }

  return posts
}

// ============ HELPERS ============
function formatDateParam(date: Date): string {
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}


// ============ GET CLIENT KEYWORDS ============
async function getClientKeywords(clientId: string): Promise<string[]> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        name: true,
        newsKeywords: true,
        keywords: { include: { keyword: true } },
      },
    })
    if (!client) return []
    const kws = new Set<string>()
    if (client.name) kws.add(client.name.toLowerCase().trim())
    if (client.newsKeywords) {
      client.newsKeywords.split(',').forEach(k => {
        const t = k.trim().toLowerCase()
        if (t) kws.add(t)
      })
    }
    client.keywords.forEach(k => {
      if (k.keyword.name) kws.add(k.keyword.name.toLowerCase().trim())
    })
    return Array.from(kws)
  } catch (error) {
    console.error('Error fetching client keywords:', error)
    return []
  }
}

// ============ MAIN SCRAPE ENDPOINT ============
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { clientId, keywords: providedKeywords, platforms: providedPlatforms, save = true } = body

    let keywords: string[] = []
    if (clientId) {
      keywords = await getClientKeywords(clientId)
      console.log(`[Social Scraper] Client keywords: ${keywords.join(', ')}`)
    }
    if (providedKeywords?.length > 0) {
      keywords = Array.from(new Set([...keywords, ...providedKeywords]))
    }
    if (keywords.length === 0) {
      keywords = ['news', 'business']
    }

    const platforms = providedPlatforms?.length > 0
      ? providedPlatforms
      : ['youtube', 'twitter', 'tiktok', 'instagram', 'linkedin', 'facebook']

    console.log(`[Social Scraper] Keywords: ${keywords.join(', ')} | Platforms: ${platforms.join(', ')}`)

    let allPosts: any[] = []
    const platformResults: Record<string, { found: number; errors: string[] }> = {}

    // Scrape each platform — use only first 3 keywords to stay within time limits
    const keywordsToUse = keywords.slice(0, 3)

    for (const platform of platforms) {
      const pl = platform.toLowerCase()
      platformResults[pl] = { found: 0, errors: [] }

      for (const keyword of keywordsToUse) {
        try {
          let posts: any[] = []
          switch (pl) {
            case 'youtube': posts = await scrapeYouTube(keyword); break
            case 'twitter': case 'x': posts = await scrapeTwitter(keyword); break
            case 'tiktok': posts = await scrapeTikTok(keyword); break
            case 'instagram': posts = await scrapeInstagram(keyword); break
            case 'linkedin': posts = await scrapeLinkedIn(keyword); break
            case 'facebook': posts = await scrapeFacebook(keyword); break
          }
          platformResults[pl].found += posts.length
          allPosts.push(...posts)
          // Small delay between requests to avoid rate limiting
          await new Promise(r => setTimeout(r, 300))
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error'
          platformResults[pl].errors.push(`${keyword}: ${msg}`)
          console.error(`[${platform}] Error for "${keyword}":`, error)
        }
      }
    }

    // Deduplicate by platform + postId
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

    if (save) {
      for (const post of uniquePosts) {
        try {
          const existing = await prisma.socialPost.findFirst({
            where: {
              platform: post.platform,
              postId: post.postId,
              clientId: clientId || null,
            },
          })
          if (existing) { duplicateCount++; continue }

          await prisma.socialPost.create({
            data: {
              platform: post.platform,
              postId: post.postId,
              content: post.content,
              summary: post.summary || '',
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
              ...(clientId ? { clientId } : {}),
            },
          })
          savedCount++
        } catch (saveError) {
          console.error('[Social Scraper] Save error:', saveError)
        }
      }
    }

    const platformSummary = Object.entries(platformResults)
      .map(([p, r]) => `${p}: ${r.found}`)
      .join(', ')

    const message = save
      ? `Found ${uniquePosts.length} posts (${platformSummary}), saved ${savedCount} new, ${duplicateCount} duplicates`
      : `Found ${uniquePosts.length} posts (${platformSummary})`

    console.log(`[Social Scraper] ${message}`)

    return NextResponse.json({
      success: true,
      message,
      posts: uniquePosts,
      postsFound: uniquePosts.length,
      postsSaved: savedCount,
      duplicates: duplicateCount,
      platformResults,
      keywords: keywordsToUse,
      platforms,
    })
  } catch (error) {
    console.error('[Social Scraper] Fatal error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to scrape social media', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check status
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    supportedPlatforms: ['youtube', 'twitter', 'tiktok', 'instagram', 'linkedin', 'facebook'],
    note: 'All scrapers use 24h time window. Pass clientId to use client keywords.',
  })
}
