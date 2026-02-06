import { NextRequest, NextResponse } from 'next/server'
import { parseHTML } from 'linkedom'
import { Readability } from '@mozilla/readability'

// Helper function to get all regex matches (compatible with older TS targets)
function getAllMatches(str: string, regex: RegExp): RegExpExecArray[] {
  const matches: RegExpExecArray[] = []
  let match: RegExpExecArray | null
  // Create a new regex with global flag to avoid infinite loops
  const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g')
  while ((match = globalRegex.exec(str)) !== null) {
    matches.push(match)
  }
  return matches
}

// Extract content from Next.js RSC (React Server Components) pages
function extractFromNextJsRSC(document: any, url: string): any {
  // Look for Next.js RSC payload scripts
  const scripts = document.querySelectorAll('script')
  const rscPayloads: string[] = []
  
  scripts.forEach((script: any) => {
    const content = script.textContent || ''
    if (content.includes('self.__next_f.push')) {
      rscPayloads.push(content)
    }
  })
  
  if (rscPayloads.length === 0) {
    return null
  }
  
  console.log('Detected Next.js RSC page, attempting extraction...')
  
  // Combine all RSC payloads - get the raw text
  let combinedPayload = rscPayloads.join('\n')
  
  // Try to extract article content from the RSC payload
  let title = ''
  let content = ''
  let textContent = ''
  let author = ''
  let publishDate = ''
  
  // First, try to find JSON-LD schema data which has structured article info
  // Look for NewsArticle schema
  const schemaMatch = combinedPayload.match(/"@type"\s*:\s*"NewsArticle"[^}]+/)
  if (schemaMatch) {
    // Extract headline from schema
    const headlineMatch = combinedPayload.match(/"headline"\s*:\s*"([^"]+)"/i)
    if (headlineMatch && headlineMatch[1]) {
      title = headlineMatch[1].replace(/\\u0026#8211;/g, '–').replace(/&amp;/g, '&')
    }
    
    // Extract datePublished
    const dateMatch = combinedPayload.match(/"datePublished"\s*:\s*"([^"]+)"/i)
    if (dateMatch && dateMatch[1]) {
      publishDate = dateMatch[1]
    }
    
    // Extract author name from schema
    const authorMatch = combinedPayload.match(/"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i)
    if (authorMatch && authorMatch[1]) {
      author = authorMatch[1]
    }
  }
  
  // Look for RSC content blocks - format like "1a:T7ce,<div..." 
  // These contain the actual HTML content
  const contentBlockMatches = getAllMatches(combinedPayload, /[0-9a-f]+:T[0-9a-f]+,(<[^"]+)/gi)
  let htmlContent = ''
  
  for (const match of contentBlockMatches) {
    let blockContent = match[1]
    // Unescape unicode and HTML entities
    blockContent = blockContent
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\u0026/g, '&')
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\')
    
    // Only include blocks that look like article content (have <p> tags)
    if (blockContent.includes('<p>') || blockContent.includes('<p ')) {
      htmlContent += blockContent
    }
  }
  
  // Also look for escaped HTML in the payload
  const escapedHtmlMatches = getAllMatches(combinedPayload, /\\u003cdiv[^"]*class=\\"[^"]*text[^"]*\\"[^"]*\\u003e([\s\S]*?)\\u003c\/div\\u003e/gi)
  for (const match of escapedHtmlMatches) {
    let blockContent = match[0]
    blockContent = blockContent
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\u0026/g, '&')
      .replace(/\\u0026#8220;/g, '"')
      .replace(/\\u0026#8221;/g, '"')
      .replace(/\\u0026#8217;/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
    htmlContent += blockContent
  }
  
  // If we found HTML content, parse it
  if (htmlContent.length > 100) {
    const { document: contentDoc } = parseHTML(`<div>${htmlContent}</div>`)
    const paragraphs = contentDoc.querySelectorAll('p')
    const texts: string[] = []
    
    paragraphs.forEach((p: any) => {
      let text = (p.textContent || '').trim()
      // Clean up HTML entities
      text = text
        .replace(/&amp;/g, '&')
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&#8217;/g, "'")
        .replace(/&nbsp;/g, ' ')
      
      if (text.length > 30 && !isBoilerplate(text)) {
        texts.push(text)
      }
    })
    
    if (texts.length > 0) {
      textContent = texts.join('\n\n')
      content = texts.map(t => `<p>${t}</p>`).join('\n')
    }
  }
  
  // Fallback: Look for og:description in meta tags for excerpt
  if (!textContent || textContent.length < 200) {
    const ogDescMatch = combinedPayload.match(/"og_description"\s*:\s*"([^"]+)"/i)
    if (ogDescMatch && ogDescMatch[1]) {
      const desc = ogDescMatch[1]
        .replace(/\\u0026hellip;/g, '...')
        .replace(/&amp;/g, '&')
        .replace(/\[\&hellip;\]/g, '...')
      if (desc.length > 100) {
        textContent = desc
        content = `<p>${desc}</p>`
      }
    }
  }
  
  // If we still don't have a title, try other patterns
  if (!title) {
    const titlePatterns = [
      /"og_title"\s*:\s*"([^"]+)"/i,
      /"title"\s*:\s*"([^"]+)"/i,
    ]
    for (const pattern of titlePatterns) {
      const match = combinedPayload.match(pattern)
      if (match && match[1] && match[1].length > 10 && match[1].length < 300) {
        title = match[1].replace(/\\u0026#8211;/g, '–').replace(/&amp;/g, '&')
        break
      }
    }
  }
  
  // If still no title, use document extraction
  if (!title) {
    title = extractTitle(document)
  }
  
  // If no author yet, try other patterns
  if (!author) {
    const authorMatch = combinedPayload.match(/"Written by"\s*:\s*"([^"]+)"/i)
    if (authorMatch && authorMatch[1]) {
      author = authorMatch[1]
    }
  }
  
  if (!content || content.length < 100) {
    return null
  }
  
  return {
    title,
    content,
    textContent: textContent || content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    excerpt: (textContent || content).slice(0, 200),
    byline: author,
    siteName: extractSiteName(document, url),
    publishDate,
  }
}

// Fallback extraction when Readability fails
function fallbackExtract(document: any, url: string) {
  // Content selectors to try in order of priority
  const contentSelectors = [
    // Semantic article containers
    'article',
    '[role="article"]',
    '[itemprop="articleBody"]',
    '[itemtype*="Article"] [itemprop="articleBody"]',
    
    // Common class names for article content
    '.article-content',
    '.article-body',
    '.article__body',
    '.post-content',
    '.post-body',
    '.entry-content',
    '.story-body',
    '.story-content',
    '.content-body',
    '.news-content',
    '.news-body',
    '.text-content',
    '.main-content',
    '.page-content',
    
    // ID-based selectors
    '#article-content',
    '#article-body',
    '#post-content',
    '#story-body',
    '#content',
    '#main-content',
    
    // Generic containers
    'main article',
    'main .content',
    'main',
    '.content',
    '#content',
  ]

  let bestContent = ''
  let bestElement: any = null

  // Try each selector
  for (const selector of contentSelectors) {
    try {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent || ''
        // Check if this has substantial content (more than 200 chars)
        if (text.trim().length > 200 && text.length > bestContent.length) {
          bestContent = text
          bestElement = element
        }
      }
    } catch {
      // Ignore invalid selectors
    }
  }

  // If no good container found, try to find the div with most paragraph content
  if (!bestElement || bestContent.length < 300) {
    const allDivs = document.querySelectorAll('div, section')
    let maxParagraphText = 0
    
    allDivs.forEach((div: any) => {
      const paragraphs = div.querySelectorAll('p')
      let totalText = 0
      paragraphs.forEach((p: any) => {
        const text = (p.textContent || '').trim()
        if (text.length > 30) { // Only count substantial paragraphs
          totalText += text.length
        }
      })
      
      if (totalText > maxParagraphText && totalText > 300) {
        maxParagraphText = totalText
        bestElement = div
        bestContent = div.textContent || ''
      }
    })
  }

  // Last resort: collect all paragraphs from the page
  if (!bestElement || bestContent.length < 300) {
    const allParagraphs = document.querySelectorAll('p')
    const paragraphTexts: string[] = []
    
    allParagraphs.forEach((p: any) => {
      const text = (p.textContent || '').trim()
      // Filter out short paragraphs and navigation/footer text
      if (text.length > 50 && !isBoilerplate(text)) {
        paragraphTexts.push(text)
      }
    })
    
    if (paragraphTexts.length > 0) {
      bestContent = paragraphTexts.join('\n\n')
      // Create a simple HTML structure
      const htmlContent = paragraphTexts.map(t => `<p>${t}</p>`).join('\n')
      return {
        title: extractTitle(document),
        content: htmlContent,
        textContent: bestContent,
        excerpt: paragraphTexts[0]?.slice(0, 200) || '',
        byline: '',
        siteName: extractSiteName(document, url),
      }
    }
  }

  if (!bestElement) {
    return null
  }

  // Clean the best element
  const clone = bestElement.cloneNode(true)
  
  // Remove unwanted nested elements
  const unwanted = [
    'script', 'style', 'nav', 'header', 'footer', 'aside',
    '.social', '.share', '.ad', '.advertisement', '.related',
    '.comments', '.sidebar', 'iframe', 'noscript'
  ]
  
  unwanted.forEach(sel => {
    try {
      clone.querySelectorAll(sel).forEach((el: any) => el.remove())
    } catch {}
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

// Check if text looks like boilerplate (nav, footer, etc.)
function isBoilerplate(text: string): boolean {
  const lower = text.toLowerCase()
  const boilerplatePatterns = [
    'all rights reserved',
    'copyright ©',
    'privacy policy',
    'terms of service',
    'cookie policy',
    'subscribe to',
    'sign up for',
    'follow us on',
    'share this article',
    'related articles',
    'you may also like',
    'advertisement',
    'sponsored content',
  ]
  return boilerplatePatterns.some(pattern => lower.includes(pattern))
}

// Extract title from various sources
function extractTitle(document: any): string {
  const selectors = [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'h1.article-title',
    'h1.post-title',
    'h1.entry-title',
    'h1[itemprop="headline"]',
    'article h1',
    '.article h1',
    'h1',
    'title',
  ]
  
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector)
      if (el) {
        const text = el.getAttribute('content') || el.textContent || ''
        if (text.trim().length > 0 && text.trim().length < 300) {
          return text.trim()
        }
      }
    } catch {}
  }
  return ''
}

// Extract site name
function extractSiteName(document: any, url: string): string {
  const selectors = [
    'meta[property="og:site_name"]',
    'meta[name="application-name"]',
  ]
  
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector)
      if (el) {
        const content = el.getAttribute('content')
        if (content) return content
      }
    } catch {}
  }
  
  // Fallback to domain name
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return ''
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Fetch the article HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch article: ${response.status} ${response.statusText}` },
        { status: 400 }
      )
    }

    const html = await response.text()

    // Parse HTML using linkedom (works on Vercel/serverless)
    const { document } = parseHTML(html)

    // Use Readability to extract article content
    const reader = new Readability(document as unknown as Document)
    const article = reader.parse()

    // If Readability fails, try fallback extraction methods
    let extractedContent: any = article
    if (!article || !article.content || article.content.trim().length < 100) {
      console.log('Readability failed, trying Next.js RSC extraction...')
      
      // First try Next.js RSC extraction (for sites like 3news.com)
      extractedContent = extractFromNextJsRSC(document, url)
      
      // If RSC extraction fails, try regular fallback
      if (!extractedContent || !extractedContent.content || extractedContent.content.trim().length < 100) {
        console.log('RSC extraction failed, trying fallback extraction...')
        extractedContent = fallbackExtract(document, url)
      }
    }

    if (!extractedContent || !extractedContent.content) {
      return NextResponse.json(
        { error: 'Could not extract article content. The page may not be a valid article.' },
        { status: 400 }
      )
    }

    // Try to extract publish date from meta tags
    let publishDate = extractedContent.publishDate || ''
    if (!publishDate) {
      const dateSelectors = [
        'meta[property="article:published_time"]',
        'meta[name="pubdate"]',
        'meta[name="publishdate"]',
        'meta[name="date"]',
        'meta[property="og:published_time"]',
        'time[datetime]',
      ]

      for (const selector of dateSelectors) {
        const element = document.querySelector(selector)
        if (element) {
          publishDate = element.getAttribute('content') || element.getAttribute('datetime') || ''
          if (publishDate) break
        }
      }
    }

    // Format the date if found
    if (publishDate) {
      try {
        const date = new Date(publishDate)
        publishDate = date.toISOString().split('T')[0]
      } catch {
        // Keep original if parsing fails
      }
    }

    // Try to extract author from meta tags if not found by Readability
    let author = extractedContent.byline || ''
    if (!author) {
      const authorSelectors = [
        'meta[name="author"]',
        'meta[property="article:author"]',
        'meta[name="twitter:creator"]',
      ]
      for (const selector of authorSelectors) {
        const element = document.querySelector(selector)
        if (element) {
          author = element.getAttribute('content') || ''
          if (author) break
        }
      }
    }

    // Extract images from the article
    const images: string[] = []
    
    // First try to get the main/featured image from meta tags
    const imageSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[property="og:image:url"]',
    ]
    
    for (const selector of imageSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        const imageUrl = element.getAttribute('content')
        if (imageUrl && !images.includes(imageUrl)) {
          images.push(imageUrl)
        }
      }
    }

    // Clean the HTML content to remove unwanted elements
    let cleanedContent = extractedContent.content || ''
    if (cleanedContent) {
      const { document: contentDoc } = parseHTML(cleanedContent)
      
      // Remove unwanted elements
      const unwantedSelectors = [
        // Social sharing
        '.social-share', '.share-buttons', '.sharing', '[class*="social"]', '[class*="share"]',
        // Ads and promotions
        '.ad', '.ads', '.advertisement', '[class*="advert"]', '[class*="promo"]', '.sponsored',
        // Related content
        '.related', '.related-posts', '.related-articles', '[class*="related"]',
        '.recommended', '[class*="recommend"]', '.more-stories', '.also-read',
        // Comments
        '.comments', '#comments', '[class*="comment"]',
        // Navigation
        '.breadcrumb', '.breadcrumbs', '.pagination', '.nav', '.navigation',
        // Author bio (usually at end)
        '.author-bio', '.author-info', '[class*="author-box"]',
        // Newsletter/subscription
        '.newsletter', '.subscribe', '[class*="newsletter"]', '[class*="subscribe"]',
        // Tags and categories
        '.tags', '.tag-list', '.categories', '[class*="tag-"]',
        // Footer content
        '.article-footer', '.post-footer', '[class*="footer"]',
        // Sidebars that might be included
        '.sidebar', 'aside', '[class*="sidebar"]',
        // Misc junk
        '.hidden', '[hidden]', '.noprint', '.print-hide',
        'script', 'style', 'noscript', 'iframe',
        // Empty elements
        'figure:empty', 'div:empty', 'p:empty', 'span:empty',
      ]
      
      unwantedSelectors.forEach(selector => {
        try {
          const elements = contentDoc.querySelectorAll(selector)
          elements.forEach((el: Element) => el.remove())
        } catch {
          // Ignore invalid selectors
        }
      })
      
      // Remove elements with suspicious text content
      const suspiciousTexts = [
        'read more', 'read also', 'see also', 'related:', 'advertisement',
        'subscribe', 'newsletter', 'follow us', 'share this', 'comments',
        'click here', 'sign up', 'join our'
      ]
      
      const allElements = contentDoc.querySelectorAll('p, div, span, a')
      allElements.forEach((el: Element) => {
        const text = (el.textContent || '').toLowerCase().trim()
        if (text.length < 50) { // Only check short elements
          for (const suspicious of suspiciousTexts) {
            if (text.includes(suspicious) && text.length < 100) {
              el.remove()
              break
            }
          }
        }
      })
      
      // Extract images before final cleanup
      const imgElements = contentDoc.querySelectorAll('img')
      imgElements.forEach((img: Element) => {
        let src = img.getAttribute('src') || img.getAttribute('data-src')
        if (src) {
          if (src.startsWith('//')) {
            src = 'https:' + src
          } else if (src.startsWith('/')) {
            const urlObj = new URL(url)
            src = urlObj.origin + src
          }
          if (src.startsWith('http') && !images.includes(src)) {
            const width = img.getAttribute('width')
            const height = img.getAttribute('height')
            if ((!width || parseInt(width) > 100) && (!height || parseInt(height) > 100)) {
              images.push(src)
            }
          }
        }
      })
      
      // Get the cleaned HTML
      cleanedContent = contentDoc.body?.innerHTML || contentDoc.toString()
      
      // Final cleanup - remove excessive whitespace and empty tags
      cleanedContent = cleanedContent
        .replace(/<(div|p|span)[^>]*>\s*<\/\1>/gi, '') // Remove empty tags
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce multiple newlines
        .trim()
    }

    return NextResponse.json({
      title: extractedContent.title || '',
      content: cleanedContent,
      textContent: extractedContent.textContent || '',
      excerpt: extractedContent.excerpt || '',
      author: author,
      publishDate: publishDate,
      siteName: extractedContent.siteName || '',
      images: images.slice(0, 10),
    })

  } catch (error) {
    console.error('Article extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to extract article. Please check the URL and try again.' },
      { status: 500 }
    )
  }
}
