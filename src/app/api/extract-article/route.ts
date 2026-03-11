import { NextRequest, NextResponse } from 'next/server'
import { parseHTML } from 'linkedom'
import { Readability } from '@mozilla/readability'

const FETCH_TIMEOUT = 15000 // 15 seconds
const MAX_HTML_SIZE = 5 * 1024 * 1024 // 5MB

// Modern User-Agent strings to rotate through
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
]

function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

// Helper function to get all regex matches
function getAllMatches(str: string, regex: RegExp): RegExpExecArray[] {
  const matches: RegExpExecArray[] = []
  let match: RegExpExecArray | null
  const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g')
  while ((match = globalRegex.exec(str)) !== null) {
    matches.push(match)
  }
  return matches
}

// Fetch with timeout, redirect limit, and retry
async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
      })

      clearTimeout(timeoutId)

      if (response.ok) return response

      // Some sites return 403/429 — retry with different UA
      if ((response.status === 403 || response.status === 429) && attempt < retries) {
        lastError = new Error(`HTTP ${response.status}`)
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }

      return response // Return non-ok response for caller to handle
    } catch (err: any) {
      clearTimeout(timeoutId)
      lastError = err

      if (err.name === 'AbortError') {
        lastError = new Error(`Request timed out after ${FETCH_TIMEOUT / 1000}s`)
      }

      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }
    }
  }

  throw lastError || new Error('Failed to fetch after retries')
}

// Clean markdown content from Jina Reader — strips nav, ads, social links, tracking, etc.
function cleanJinaMarkdown(content: string, title: string): string {
  let lines = content.split('\n')

  // 1. Find where the actual article starts (after the title heading)
  let articleStartIdx = 0
  if (title) {
    // Look for the title as a heading (# or === underline)
    const titleLower = title.toLowerCase().trim()
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase().trim()
      // Match heading that contains the title text
      if (lineLower.includes(titleLower) || 
          (lineLower.replace(/^#+\s*/, '') === titleLower) ||
          (lineLower === titleLower && i + 1 < lines.length && /^=+$/.test(lines[i + 1].trim()))) {
        // Skip past the title heading and any immediately following share/social lines
        articleStartIdx = i + 1
        if (i + 1 < lines.length && /^=+$/.test(lines[i + 1].trim())) {
          articleStartIdx = i + 2
        }
        // Skip share buttons, social links, image right after title
        while (articleStartIdx < lines.length) {
          const nextLine = lines[articleStartIdx].trim().toLowerCase()
          if (nextLine === '' || nextLine === 'share' || 
              nextLine.startsWith('[facebook]') || nextLine.startsWith('[twitter]') ||
              nextLine.startsWith('[pinterest]') || nextLine.startsWith('[whatsapp]') ||
              nextLine.startsWith('[![') || nextLine.startsWith('[](') ||
              /^\[image \d+/.test(nextLine)) {
            articleStartIdx++
          } else {
            break
          }
        }
        break
      }
    }
  }

  // If we couldn't find the title, try to skip past obvious nav/header content
  if (articleStartIdx === 0) {
    for (let i = 0; i < Math.min(lines.length, 100); i++) {
      const line = lines[i].trim()
      // First substantial paragraph (not a link, not a heading, not empty)
      if (line.length > 80 && !line.startsWith('[') && !line.startsWith('#') && 
          !line.startsWith('*') && !line.startsWith('!') && !line.startsWith('|')) {
        articleStartIdx = i
        break
      }
    }
  }

  lines = lines.slice(articleStartIdx)

  // 2. Filter out junk lines
  const cleanedLines: string[] = []
  let hitFooter = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const lower = trimmed.toLowerCase()

    // Stop at footer/related content markers
    if (hitFooter) continue
    if (/^(related articles|related posts|you may also like|more stories|previous article|next article)/i.test(trimmed)) {
      hitFooter = true
      continue
    }
    if (/^(navigation links|useful links|download our app|copyright ©)/i.test(trimmed)) {
      hitFooter = true
      continue
    }
    // "RELATED ARTICLES" as heading
    if (/^#+\s*(related|more from|you might|also read)/i.test(trimmed)) {
      hitFooter = true
      continue
    }
    // Tags section
    if (trimmed === '* Tags' || lower === 'tags') {
      hitFooter = true
      continue
    }

    // Skip individual junk lines
    // Navigation menu items (bullet links to site sections)
    if (/^\*\s+\[.+\]\(https?:\/\/.+\)$/.test(trimmed) && trimmed.length < 150) continue
    // Standalone links that are just navigation
    if (/^\[.+\]\(https?:\/\/.+\)$/.test(trimmed) && !lower.includes('see also') && trimmed.length < 100) continue
    // Social share buttons
    if (/^\[(facebook|twitter|pinterest|whatsapp|linkedin|share|more)\]/i.test(trimmed)) continue
    if (lower === 'share' || lower === 'shares') continue
    // Image references (tracking pixels, icons, logos)
    if (/^!\[image \d+\]\(https?:\/\/pl\.primis\.tech/i.test(trimmed)) continue
    if (/^!\[image \d+\]\(https?:\/\/cdn\./i.test(trimmed)) continue
    if (/^!\[image \d+.*\]\(.*(?:icon|logo|pixel|tracker|beacon)/i.test(trimmed)) continue
    // Tracking pixel images (base64-like URLs)
    if (/^!\[.*\]\(https?:\/\/.*(?:liveView|pixel|track|beacon)/i.test(trimmed)) continue
    // Empty markdown links
    if (trimmed === '[](') continue
    if (/^\[\]\(https?:\/\//.test(trimmed)) continue
    // Ad/promo content
    if (lower.includes('sponsored') || lower.includes('taboola') || lower.includes('advertisement')) continue
    if (lower.includes('| sponsored') || lower.includes('[sponsored]')) continue
    // Login/signup modals
    if (/^(sign in|sign up|login|register|create an account|forgot password|reset password)/i.test(trimmed)) continue
    if (lower.includes('sign in to continue') || lower.includes('sign up to get started')) continue
    // Terms and conditions blocks
    if (lower.includes('terms and conditions') || lower.includes('privacy policy')) continue
    if (lower.includes('cookie policy') || lower.includes('terms of service')) continue
    // WhatsApp channel promos
    if (lower.includes('join our whatsapp') || lower.includes('whatsapp channel')) continue
    if (lower.includes('join here:')) continue
    // "Get the news" promos
    if (lower.includes('get the news that matters')) continue
    // Undo buttons (Taboola)
    if (trimmed === 'Undo') continue
    // "Read More" / "Learn More" / "Shop Now" / "Discover" standalone
    if (/^(read more|learn more|shop now|discover|skip)$/i.test(trimmed)) continue
    // Comments section
    if (/^(comments?:|this article has \d+ comment)/i.test(lower)) continue
    if (lower.includes('give your comment')) continue
    // "Listen to Article"
    if (lower.includes('listen to article')) continue
    // Breadcrumb navigation
    if (lower.startsWith('you are here:')) continue
    // "See also" links — keep the text but strip the link formatting
    if (/^\[see also/i.test(trimmed)) {
      const textMatch = trimmed.match(/^\[See also (.+?)\]\(.+\)$/i)
      if (textMatch) {
        // Skip "see also" cross-links entirely — they're not part of the article
        continue
      }
    }
    // Self-service advert links
    if (lower.includes('self service advert') || lower.includes('sitemap') && lower.includes('partners')) continue
    // Disclaimer links
    if (/^\[disclaimer\]/i.test(trimmed)) continue
    // "Prev" / "Next" navigation
    if (/^(\[« prev\]|\[next »\])/i.test(trimmed)) continue
    // Heading-only lines that are just "Welcome," or "Hello,"
    if (/^(welcome|hello),?\s*$/i.test(trimmed)) continue
    // "x" close buttons
    if (trimmed === 'x') continue
    // Lines that are just "Business" or "News" section headers from nav
    if (/^(business|news|sports|entertainment|africa|opinions|home)\s*$/i.test(trimmed) && i < 20) continue
    // Date-only breadcrumb lines
    if (/^\[\d{4}-\d{2}-\d{2}\]/.test(trimmed)) continue
    // "Ads by" lines
    if (lower.startsWith('ads by') || lower.startsWith('x ads by')) continue

    cleanedLines.push(line)
  }

  // 3. Final cleanup — remove leading/trailing empty lines and excessive blank lines
  let result = cleanedLines.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // 4. Strip remaining markdown image references that look like tracking (very long base64-ish URLs)
  result = result.replace(/!\[Image \d+\]\([^)]{500,}\)/g, '')

  // 5. Remove any remaining markdown link-only lines (lines that are just [text](url) with no surrounding content)
  result = result.split('\n').filter(line => {
    const t = line.trim()
    // Keep lines that have actual text content beyond just a link
    if (/^\[.+\]\(.+\)$/.test(t) && t.length < 120) return false
    // Keep lines that are just image references to small icons
    if (/^!\[.*(?:icon|logo)\]/.test(t)) return false
    return true
  }).join('\n')

  return result.replace(/\n{3,}/g, '\n\n').trim()
}

// Fallback: use Jina Reader API for JS-rendered sites
async function fetchViaJinaReader(url: string): Promise<{ title: string; content: string; textContent: string; author: string; publishDate: string; images: string[] } | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    const response = await fetch(`https://r.jina.ai/${url}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'json',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) return null

    const data = await response.json()

    const rawContent = data.data?.content || ''
    const title = data.data?.title || ''

    if (rawContent.trim().length < 100) return null

    // Clean the Jina markdown output
    const cleanedContent = cleanJinaMarkdown(rawContent, title)

    if (cleanedContent.trim().length < 100) return null

    // Convert cleaned markdown to simple HTML paragraphs for consistency
    const htmlContent = cleanedContent
      .split('\n\n')
      .filter((p: string) => p.trim().length > 0)
      .map((p: string) => {
        const trimmed = p.trim()
        // Skip lines that are just markdown headings used as section breaks
        if (/^#+\s/.test(trimmed)) {
          const headingText = trimmed.replace(/^#+\s*/, '')
          return `<h3>${headingText}</h3>`
        }
        return `<p>${trimmed}</p>`
      })
      .join('\n')

    const textContent = cleanedContent
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove image markdown
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/[#*_~`]/g, '') // Remove markdown formatting
      .replace(/\n{2,}/g, '\n\n')
      .trim()

    return {
      title,
      content: htmlContent,
      textContent,
      author: data.data.author || '',
      publishDate: data.data.publishedTime || '',
      images: data.data.images || [],
    }
  } catch (err) {
    console.log('Jina Reader fallback failed:', err instanceof Error ? err.message : 'unknown error')
    return null
  }
}

// Extract content from Next.js RSC (React Server Components) pages
function extractFromNextJsRSC(document: any, url: string): any {
  const scripts = document.querySelectorAll('script')
  const rscPayloads: string[] = []

  scripts.forEach((script: any) => {
    const content = script.textContent || ''
    if (content.includes('self.__next_f.push')) {
      rscPayloads.push(content)
    }
  })

  if (rscPayloads.length === 0) return null

  let combinedPayload = rscPayloads.join('\n')

  let title = ''
  let content = ''
  let textContent = ''
  let author = ''
  let publishDate = ''

  // Extract from JSON-LD schema
  const schemaMatch = combinedPayload.match(/"@type"\s*:\s*"NewsArticle"[^}]+/)
  if (schemaMatch) {
    const headlineMatch = combinedPayload.match(/"headline"\s*:\s*"([^"]+)"/i)
    if (headlineMatch?.[1]) {
      title = headlineMatch[1].replace(/\\u0026#8211;/g, '–').replace(/&amp;/g, '&')
    }
    const dateMatch = combinedPayload.match(/"datePublished"\s*:\s*"([^"]+)"/i)
    if (dateMatch?.[1]) publishDate = dateMatch[1]
    const authorMatch = combinedPayload.match(/"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i)
    if (authorMatch?.[1]) author = authorMatch[1]
  }

  // Look for RSC content blocks
  const contentBlockMatches = getAllMatches(combinedPayload, /[0-9a-f]+:T[0-9a-f]+,(<[^"]+)/gi)
  let htmlContent = ''

  for (const match of contentBlockMatches) {
    let blockContent = match[1]
      .replace(/\\u003c/g, '<').replace(/\\u003e/g, '>')
      .replace(/\\u0026/g, '&').replace(/\\"/g, '"')
      .replace(/\\n/g, '\n').replace(/\\\\/g, '\\')
    if (blockContent.includes('<p>') || blockContent.includes('<p ')) {
      htmlContent += blockContent
    }
  }

  // Also look for escaped HTML
  const escapedHtmlMatches = getAllMatches(combinedPayload, /\\u003cdiv[^"]*class=\\"[^"]*text[^"]*\\"[^"]*\\u003e([\s\S]*?)\\u003c\/div\\u003e/gi)
  for (const match of escapedHtmlMatches) {
    let blockContent = match[0]
      .replace(/\\u003c/g, '<').replace(/\\u003e/g, '>')
      .replace(/\\u0026/g, '&').replace(/\\u0026#8220;/g, '\u201c')
      .replace(/\\u0026#8221;/g, '\u201d').replace(/\\u0026#8217;/g, '\u2019')
      .replace(/\\"/g, '"').replace(/\\n/g, '\n')
    htmlContent += blockContent
  }

  if (htmlContent.length > 100) {
    const { document: contentDoc } = parseHTML(`<div>${htmlContent}</div>`)
    const paragraphs = contentDoc.querySelectorAll('p')
    const texts: string[] = []
    paragraphs.forEach((p: any) => {
      let text = (p.textContent || '').trim()
        .replace(/&amp;/g, '&').replace(/&#8220;/g, '\u201c')
        .replace(/&#8221;/g, '\u201d').replace(/&#8217;/g, '\u2019')
        .replace(/&nbsp;/g, ' ')
      if (text.length > 30 && !isBoilerplate(text)) texts.push(text)
    })
    if (texts.length > 0) {
      textContent = texts.join('\n\n')
      content = texts.map(t => `<p>${t}</p>`).join('\n')
    }
  }

  // Fallback: og:description
  if (!textContent || textContent.length < 200) {
    const ogDescMatch = combinedPayload.match(/"og_description"\s*:\s*"([^"]+)"/i)
    if (ogDescMatch?.[1]) {
      const desc = ogDescMatch[1].replace(/\\u0026hellip;/g, '...').replace(/&amp;/g, '&')
      if (desc.length > 100) {
        textContent = desc
        content = `<p>${desc}</p>`
      }
    }
  }

  if (!title) {
    const titlePatterns = [/"og_title"\s*:\s*"([^"]+)"/i, /"title"\s*:\s*"([^"]+)"/i]
    for (const pattern of titlePatterns) {
      const match = combinedPayload.match(pattern)
      if (match?.[1] && match[1].length > 10 && match[1].length < 300) {
        title = match[1].replace(/\\u0026#8211;/g, '–').replace(/&amp;/g, '&')
        break
      }
    }
  }
  if (!title) title = extractTitle(document)

  if (!author) {
    const authorMatch = combinedPayload.match(/"Written by"\s*:\s*"([^"]+)"/i)
    if (authorMatch?.[1]) author = authorMatch[1]
  }

  if (!content || content.length < 100) return null

  return {
    title, content,
    textContent: textContent || content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    excerpt: (textContent || content).slice(0, 200),
    byline: author,
    siteName: extractSiteName(document, url),
    publishDate,
  }
}

// Fallback extraction when Readability fails
function fallbackExtract(document: any, url: string) {
  const contentSelectors = [
    'article', '[role="article"]', '[itemprop="articleBody"]',
    '[itemtype*="Article"] [itemprop="articleBody"]',
    '.article-content', '.article-body', '.article__body',
    '.post-content', '.post-body', '.entry-content',
    '.story-body', '.story-content', '.content-body',
    '.news-content', '.news-body', '.text-content',
    '.main-content', '.page-content',
    '#article-content', '#article-body', '#post-content',
    '#story-body', '#content', '#main-content',
    'main article', 'main .content', 'main', '.content', '#content',
  ]

  let bestContent = ''
  let bestElement: any = null

  for (const selector of contentSelectors) {
    try {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent || ''
        if (text.trim().length > 200 && text.length > bestContent.length) {
          bestContent = text
          bestElement = element
        }
      }
    } catch { /* ignore invalid selectors */ }
  }

  // Find div with most paragraph content
  if (!bestElement || bestContent.length < 300) {
    const allDivs = document.querySelectorAll('div, section')
    let maxParagraphText = 0
    allDivs.forEach((div: any) => {
      const paragraphs = div.querySelectorAll('p')
      let totalText = 0
      paragraphs.forEach((p: any) => {
        const text = (p.textContent || '').trim()
        if (text.length > 30) totalText += text.length
      })
      if (totalText > maxParagraphText && totalText > 300) {
        maxParagraphText = totalText
        bestElement = div
        bestContent = div.textContent || ''
      }
    })
  }

  // Last resort: collect all paragraphs
  if (!bestElement || bestContent.length < 300) {
    const allParagraphs = document.querySelectorAll('p')
    const paragraphTexts: string[] = []
    allParagraphs.forEach((p: any) => {
      const text = (p.textContent || '').trim()
      if (text.length > 50 && !isBoilerplate(text)) paragraphTexts.push(text)
    })
    if (paragraphTexts.length > 0) {
      bestContent = paragraphTexts.join('\n\n')
      return {
        title: extractTitle(document),
        content: paragraphTexts.map(t => `<p>${t}</p>`).join('\n'),
        textContent: bestContent,
        excerpt: paragraphTexts[0]?.slice(0, 200) || '',
        byline: '',
        siteName: extractSiteName(document, url),
      }
    }
  }

  if (!bestElement) return null

  const clone = bestElement.cloneNode(true)
  const unwanted = [
    'script', 'style', 'nav', 'header', 'footer', 'aside',
    '.social', '.share', '.ad', '.advertisement', '.related',
    '.comments', '.sidebar', 'iframe', 'noscript',
  ]
  unwanted.forEach((sel: string) => {
    try { clone.querySelectorAll(sel).forEach((el: any) => el.remove()) } catch { /* skip */ }
  })

  return {
    title: extractTitle(document),
    content: clone.innerHTML || clone.toString(),
    textContent: clone.textContent || '',
    excerpt: (clone.textContent || '').slice(0, 200),
    byline: '',
    siteName: extractSiteName(document, url),
  }
}

function isBoilerplate(text: string): boolean {
  const lower = text.toLowerCase()
  const patterns = [
    'all rights reserved', 'copyright ©', 'privacy policy',
    'terms of service', 'cookie policy', 'subscribe to',
    'sign up for', 'follow us on', 'share this article',
    'related articles', 'you may also like', 'advertisement',
    'sponsored content',
  ]
  return patterns.some(p => lower.includes(p))
}

function extractTitle(document: any): string {
  const selectors = [
    'meta[property="og:title"]', 'meta[name="twitter:title"]',
    'h1.article-title', 'h1.post-title', 'h1.entry-title',
    'h1[itemprop="headline"]', 'article h1', '.article h1',
    'h1', 'title',
  ]
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector)
      if (el) {
        const text = el.getAttribute('content') || el.textContent || ''
        if (text.trim().length > 0 && text.trim().length < 300) return text.trim()
      }
    } catch { /* skip */ }
  }
  return ''
}

function extractSiteName(document: any, url: string): string {
  const selectors = ['meta[property="og:site_name"]', 'meta[name="application-name"]']
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector)
      if (el) {
        const content = el.getAttribute('content')
        if (content) return content
      }
    } catch { /* skip */ }
  }
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return ''
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol')
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL format. Must be a valid http/https URL.' }, { status: 400 })
    }

    // ---- STEP 1: Fetch HTML with timeout + retry ----
    let html: string
    let fetchFailed = false
    let fetchError = ''

    try {
      const response = await fetchWithRetry(url)

      if (!response.ok) {
        fetchFailed = true
        fetchError = `Site returned ${response.status} ${response.statusText}`
      } else {
        // Guard against huge responses
        const contentLength = response.headers.get('content-length')
        if (contentLength && parseInt(contentLength) > MAX_HTML_SIZE) {
          return NextResponse.json({ error: 'Page is too large to process.' }, { status: 400 })
        }

        html = await response.text()

        if (html.length > MAX_HTML_SIZE) {
          html = html.slice(0, MAX_HTML_SIZE)
        }
      }
    } catch (err: any) {
      fetchFailed = true
      fetchError = err.message || 'Failed to fetch the page'
    }

    // ---- STEP 2: Try local extraction (Readability → RSC → fallback) ----
    let extractedContent: any = null
    let usedJina = false

    if (!fetchFailed && html!) {
      // Parse HTML using linkedom
      const { document } = parseHTML(html)

      // Clone the HTML for fallback since Readability mutates the DOM
      const { document: fallbackDoc } = parseHTML(html)

      // Try Readability first
      try {
        const reader = new Readability(document as unknown as Document)
        const article = reader.parse()
        if (article?.content && article.content.trim().length >= 100) {
          extractedContent = article
        }
      } catch (err) {
        console.log('Readability threw:', err instanceof Error ? err.message : 'unknown')
      }

      // If Readability failed, try RSC extraction (uses the fallback doc since Readability mutated the original)
      if (!extractedContent || !extractedContent.content || extractedContent.content.trim().length < 100) {
        extractedContent = extractFromNextJsRSC(fallbackDoc, url)
      }

      // If RSC failed, try DOM fallback
      if (!extractedContent || !extractedContent.content || extractedContent.content.trim().length < 100) {
        extractedContent = fallbackExtract(fallbackDoc, url)
      }
    }

    // ---- STEP 3: If local extraction failed, try Jina Reader (handles JS-rendered sites) ----
    if (!extractedContent || !extractedContent.content || extractedContent.content.trim().length < 100) {
      console.log('Local extraction failed, trying Jina Reader for:', url)
      const jinaResult = await fetchViaJinaReader(url)

      if (jinaResult && jinaResult.content.length >= 100) {
        usedJina = true
        extractedContent = {
          title: jinaResult.title,
          content: jinaResult.content,
          textContent: jinaResult.textContent,
          excerpt: jinaResult.textContent.slice(0, 200),
          byline: jinaResult.author,
          siteName: extractSiteName({ querySelector: () => null }, url),
          publishDate: jinaResult.publishDate,
        }
      }
    }

    // ---- STEP 4: If everything failed, return helpful error ----
    if (!extractedContent || !extractedContent.content) {
      let errorMsg = 'Could not extract article content.'
      if (fetchFailed) {
        errorMsg = `Could not reach the website: ${fetchError}`
      } else {
        errorMsg += ' The page may require JavaScript, be behind a paywall, or have an unusual structure.'
      }
      return NextResponse.json({ error: errorMsg }, { status: 400 })
    }

    // ---- STEP 5: Extract metadata ----
    // Re-parse original HTML for metadata extraction (only if we have it)
    let metaDoc: any = null
    if (!fetchFailed && html!) {
      const parsed = parseHTML(html)
      metaDoc = parsed.document
    }

    // Publish date
    let publishDate = extractedContent.publishDate || ''
    if (!publishDate && metaDoc) {
      const dateSelectors = [
        'meta[property="article:published_time"]',
        'meta[name="pubdate"]', 'meta[name="publishdate"]',
        'meta[name="date"]', 'meta[property="og:published_time"]',
        'time[datetime]', 'meta[name="DC.date.issued"]',
        'meta[property="article:modified_time"]',
      ]
      for (const selector of dateSelectors) {
        try {
          const element = metaDoc.querySelector(selector)
          if (element) {
            publishDate = element.getAttribute('content') || element.getAttribute('datetime') || ''
            if (publishDate) break
          }
        } catch { /* skip */ }
      }
    }
    if (publishDate) {
      try {
        const date = new Date(publishDate)
        if (!isNaN(date.getTime())) {
          publishDate = date.toISOString().split('T')[0]
        }
      } catch { /* keep original */ }
    }

    // Author
    let author = extractedContent.byline || ''
    if (!author && metaDoc) {
      const authorSelectors = [
        'meta[name="author"]', 'meta[property="article:author"]',
        'meta[name="twitter:creator"]', 'meta[name="byl"]',
        '[rel="author"]', '.author-name', '.byline',
      ]
      for (const selector of authorSelectors) {
        try {
          const element = metaDoc.querySelector(selector)
          if (element) {
            author = element.getAttribute('content') || element.textContent || ''
            if (author) {
              author = author.replace(/^by\s+/i, '').trim()
              break
            }
          }
        } catch { /* skip */ }
      }
    }

    // Images
    const images: string[] = []
    if (metaDoc) {
      const imageSelectors = [
        'meta[property="og:image"]', 'meta[name="twitter:image"]',
        'meta[property="og:image:url"]',
      ]
      for (const selector of imageSelectors) {
        try {
          const element = metaDoc.querySelector(selector)
          if (element) {
            const imageUrl = element.getAttribute('content')
            if (imageUrl && !images.includes(imageUrl)) images.push(imageUrl)
          }
        } catch { /* skip */ }
      }
    }

    // ---- STEP 6: Clean content (skip if Jina already cleaned it) ----
    let cleanedContent = extractedContent.content || ''
    if (!usedJina && cleanedContent) {
      try {
        const { document: contentDoc } = parseHTML(cleanedContent)

        const unwantedSelectors = [
          '.social-share', '.share-buttons', '.sharing', '[class*="social"]', '[class*="share"]',
          '.ad', '.ads', '.advertisement', '[class*="advert"]', '[class*="promo"]', '.sponsored',
          '.related', '.related-posts', '.related-articles', '[class*="related"]',
          '.recommended', '[class*="recommend"]', '.more-stories', '.also-read',
          '.comments', '#comments', '[class*="comment"]',
          '.breadcrumb', '.breadcrumbs', '.pagination', '.nav', '.navigation',
          '.author-bio', '.author-info', '[class*="author-box"]',
          '.newsletter', '.subscribe', '[class*="newsletter"]', '[class*="subscribe"]',
          '.tags', '.tag-list', '.categories', '[class*="tag-"]',
          '.article-footer', '.post-footer',
          '.sidebar', 'aside', '[class*="sidebar"]',
          '.hidden', '[hidden]', '.noprint', '.print-hide',
          'script', 'style', 'noscript', 'iframe',
        ]

        unwantedSelectors.forEach(selector => {
          try {
            contentDoc.querySelectorAll(selector).forEach((el: Element) => el.remove())
          } catch { /* skip */ }
        })

        // Remove short suspicious elements
        const suspiciousTexts = [
          'read more', 'read also', 'see also', 'related:', 'advertisement',
          'subscribe', 'newsletter', 'follow us', 'share this', 'comments',
          'click here', 'sign up', 'join our',
        ]
        contentDoc.querySelectorAll('p, div, span, a').forEach((el: Element) => {
          const text = (el.textContent || '').toLowerCase().trim()
          if (text.length < 50) {
            for (const suspicious of suspiciousTexts) {
              if (text.includes(suspicious) && text.length < 100) {
                el.remove()
                break
              }
            }
          }
        })

        // Extract article body images
        contentDoc.querySelectorAll('img').forEach((img: Element) => {
          let src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src')
          if (src) {
            if (src.startsWith('//')) src = 'https:' + src
            else if (src.startsWith('/')) src = parsedUrl.origin + src
            if (src.startsWith('http') && !images.includes(src)) {
              const width = img.getAttribute('width')
              const height = img.getAttribute('height')
              if ((!width || parseInt(width) > 100) && (!height || parseInt(height) > 100)) {
                images.push(src)
              }
            }
          }
        })

        cleanedContent = (contentDoc.body?.innerHTML || contentDoc.toString())
          .replace(/<(div|p|span)[^>]*>\s*<\/\1>/gi, '')
          .replace(/\n\s*\n\s*\n/g, '\n\n')
          .trim()
      } catch (err) {
        console.log('Content cleaning failed, using raw content:', err instanceof Error ? err.message : 'unknown')
        // Keep the uncleaned content rather than failing
      }
    }

    return NextResponse.json({
      title: extractedContent.title || '',
      content: cleanedContent,
      textContent: extractedContent.textContent || '',
      excerpt: extractedContent.excerpt || '',
      author,
      publishDate,
      siteName: extractedContent.siteName || '',
      images: images.slice(0, 10),
    })

  } catch (error) {
    console.error('Article extraction error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to extract article: ${message}. Please check the URL and try again.` },
      { status: 500 }
    )
  }
}
