import { NextRequest, NextResponse } from 'next/server'
import PptxGenJS from 'pptxgenjs'

export const dynamic = 'force-dynamic'

// Brand colors
const GOLD = 'D4941A'
const DARK_TEXT = '333333'
const GRAY_TEXT = '666666'
const LIGHT_GRAY = '999999'
const WHITE = 'FFFFFF'
const BLACK = '000000'
const RED = 'EF4444'
const GREEN = '10B981'
const YELLOW = 'EAB308'
const ORANGE = 'F97316'
const BLUE = '3B82F6'
const PURPLE = 'C084FC'

type SlideType = ReturnType<PptxGenJS['addSlide']>

/** Fetch an image URL and return base64 data URI, or null on failure */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/png'
    const base64 = Buffer.from(buffer).toString('base64')
    return `data:${contentType};base64,${base64}`
  } catch {
    return null
  }
}

// Helper: Add gold header bar with title and logo/client name
function addSlideHeader(pptx: PptxGenJS, slide: SlideType, title: string, clientName?: string, logoBase64?: string | null) {
  // Gold header bar
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: GOLD } })
  slide.addText(title, { x: 0.4, y: 0.08, w: 7, h: 0.45, fontSize: 20, color: WHITE, fontFace: 'Arial' })
  // Client logo (contain-fit) or name top-right
  if (logoBase64) {
    slide.addImage({ data: logoBase64, x: 8.6, y: 0.05, w: 1.2, h: 0.5, sizing: { type: 'contain', w: 1.2, h: 0.5 } })
  } else if (clientName) {
    slide.addText(clientName, { x: 7.5, y: 0.08, w: 2.3, h: 0.45, fontSize: 10, color: WHITE, align: 'right', fontFace: 'Arial', bold: true })
  }
  // Ovaview footer
  slide.addText('Ovaview', { x: 0.3, y: 5.1, w: 1.5, h: 0.3, fontSize: 8, color: ORANGE, fontFace: 'Arial', bold: true })
}

// Helper: Section divider slide (gold background)
function addSectionDivider(pptx: PptxGenJS, title: string, clientName?: string, logoBase64?: string | null) {
  const slide = pptx.addSlide()
  slide.background = { fill: GOLD }
  slide.addText(title, { x: 0.5, y: 1.8, w: 9, h: 1.2, fontSize: 36, color: WHITE, bold: true, align: 'center', fontFace: 'Arial' })
  if (logoBase64) {
    slide.addImage({ data: logoBase64, x: 8.4, y: 0.15, w: 1.3, h: 0.55, sizing: { type: 'contain', w: 1.3, h: 0.55 } })
  } else if (clientName) {
    slide.addText(clientName, { x: 7.5, y: 0.2, w: 2.3, h: 0.4, fontSize: 10, color: WHITE, align: 'right', fontFace: 'Arial', bold: true })
  }
}


export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const {
      clientName, clientLogo, industryName, dateRangeLabel,
      scopeOfCoverage, mediaSourcesIndustry, monthlyTrend, thematicAreas,
      topJournalists, totalClientMentions, clientSourcesOfMentions,
      clientMonthlyTrend, orgVisibility, clientMajorStories,
      competitorAnalysis, industrySentiment, clientSentiment,
      keyTakeouts, totalIndustryStories,
    } = data

    const pptx = new PptxGenJS()
    pptx.author = 'Ovaview'
    pptx.title = `Media Presence Analysis Report - ${clientName}`
    pptx.subject = `PR Presence Analysis for ${clientName}`
    pptx.company = 'Ovaview Media Monitoring'
    pptx.layout = 'LAYOUT_WIDE'

    // Fetch client logo as base64 for embedding in slides
    const logoBase64 = clientLogo ? await fetchImageAsBase64(clientLogo) : null

    // Chart type references
    const CHART_BAR = pptx.ChartType.bar
    const CHART_PIE = pptx.ChartType.pie
    const CHART_DOUGHNUT = pptx.ChartType.doughnut

    // ===== SLIDE 1: COVER =====
    const slide1 = pptx.addSlide()
    slide1.background = { fill: GOLD }
    slide1.addText('MEDIA PRESENCE\nANALYSIS REPORT', {
      x: 0.8, y: 1.2, w: 8, h: 2, fontSize: 44, color: WHITE, bold: true, align: 'center', fontFace: 'Arial', lineSpacingMultiple: 1.2,
    })
    slide1.addText(dateRangeLabel, {
      x: 0.8, y: 3.4, w: 8, h: 0.5, fontSize: 18, color: WHITE, align: 'center', fontFace: 'Arial',
    })
    // Logo top-right on cover, client name below date if no logo
    if (logoBase64) {
      slide1.addImage({ data: logoBase64, x: 7.8, y: 0.2, w: 1.8, h: 1.0, sizing: { type: 'contain', w: 1.8, h: 1.0 } })
    }
    if (clientName && !logoBase64) {
      slide1.addText(clientName, { x: 1, y: 4.1, w: 7.6, h: 0.6, fontSize: 20, color: WHITE, align: 'center', fontFace: 'Arial', bold: true })
    }

    // ===== SLIDE 2: BRIEF =====
    const slide2 = pptx.addSlide()
    addSlideHeader(pptx, slide2, 'Brief', clientName, logoBase64)
    slide2.addText(
      [
        { text: 'This report is an analysis of the PR presence for\n', options: { fontSize: 18, color: GRAY_TEXT } },
        { text: `${clientName}\n`, options: { fontSize: 22, color: DARK_TEXT, bold: true } },
        { text: `The data was captured from ${dateRangeLabel}.`, options: { fontSize: 18, color: GRAY_TEXT } },
      ],
      { x: 1, y: 1.5, w: 7.5, h: 2.5, fontFace: 'Arial', lineSpacingMultiple: 1.6, align: 'center', valign: 'middle' }
    )

    // ===== SLIDE 3: SECTION DIVIDER - Industry =====
    addSectionDivider(pptx, `MEDIA PRESENCE ANALYSIS\nIndustry`, clientName, logoBase64)

    // ===== SLIDE 4: SCOPE OF COVERAGE - OVERALL =====
    const slide4 = pptx.addSlide()
    addSlideHeader(pptx, slide4, 'Scope of Coverage - Overall', clientName, logoBase64)

    const scopeItems = [
      { label: 'News Website', count: scopeOfCoverage.newsWebsite.count, desc: scopeOfCoverage.newsWebsite.description },
      { label: 'Print Media', count: scopeOfCoverage.printMedia.count, desc: scopeOfCoverage.printMedia.description },
      { label: 'Radio', count: scopeOfCoverage.radio.count, desc: scopeOfCoverage.radio.description },
      { label: 'Television', count: scopeOfCoverage.television.count, desc: scopeOfCoverage.television.description },
    ]
    const totalScope = scopeItems.reduce((sum, item) => sum + item.count, 0)
    const scopeColors = [GOLD, GRAY_TEXT, GOLD, GRAY_TEXT]

    scopeItems.forEach((item, i) => {
      const x = 0.4 + i * 2.35
      slide4.addChart(CHART_DOUGHNUT, [
        { name: item.label, labels: [item.label, 'Other'], values: [item.count, Math.max(0, totalScope - item.count)] }
      ], {
        x, y: 0.9, w: 1.5, h: 1.5, showLegend: false, showValue: false, showPercent: false,
        holeSize: 65, chartColors: [scopeColors[i], 'E5E7EB'],
      })
      slide4.addText(item.count.toString(), { x, y: 1.35, w: 1.5, h: 0.6, fontSize: 28, bold: true, color: DARK_TEXT, align: 'center', valign: 'middle', fontFace: 'Arial' })
      slide4.addText(item.label, { x: x - 0.1, y: 2.5, w: 1.7, h: 0.35, fontSize: 12, color: DARK_TEXT, align: 'center', fontFace: 'Arial', bold: true })
      slide4.addText(item.desc, { x: x - 0.2, y: 2.85, w: 1.9, h: 1.2, fontSize: 8, color: GRAY_TEXT, align: 'center', fontFace: 'Arial' })
    })

    // ===== SLIDE 5: MEDIA SOURCES - INDUSTRY (Pie chart) =====
    const slide5 = pptx.addSlide()
    addSlideHeader(pptx, slide5, 'Media Sources - Industry', clientName, logoBase64)

    slide5.addChart(CHART_PIE, [
      {
        name: 'Media Sources',
        labels: ['News Website', 'Print Media', 'Radio', 'TV'],
        values: [mediaSourcesIndustry.newsWebsite.count, mediaSourcesIndustry.printMedia.count, mediaSourcesIndustry.radio.count, mediaSourcesIndustry.tv.count],
      }
    ], {
      x: 0.3, y: 0.8, w: 4.5, h: 3.5,
      showLegend: true, legendPos: 'b', legendFontSize: 9,
      showValue: true, showPercent: false,
      dataLabelPosition: 'outEnd', dataLabelFontSize: 10,
      chartColors: [ORANGE, BLACK, PURPLE, GRAY_TEXT],
    })

    // Sort media sources for analysis text
    const mediaSources = [
      { name: 'News websites', count: mediaSourcesIndustry.newsWebsite.count, percentage: mediaSourcesIndustry.newsWebsite.percentage },
      { name: 'Print media', count: mediaSourcesIndustry.printMedia.count, percentage: mediaSourcesIndustry.printMedia.percentage },
      { name: 'Radio', count: mediaSourcesIndustry.radio.count, percentage: mediaSourcesIndustry.radio.percentage },
      { name: 'TV', count: mediaSourcesIndustry.tv.count, percentage: mediaSourcesIndustry.tv.percentage },
    ].sort((a, b) => b.count - a.count)

    const introText = `The ${industryName || 'sector'} continued to receive substantial media publicity during the period under review.`
    const totalText = `Total Coverage – ${totalIndustryStories.toLocaleString()} news stories from four media sources (print media, news website, radio and television).`
    const bulletPoints = mediaSources.map((source, i) => {
      if (i === 0) return `${source.name} – highest (${source.percentage}%)`
      if (i === mediaSources.length - 1) return `${source.name} – lowest (${source.percentage}%)`
      return `${source.name} (${source.percentage}%)`
    })

    slide5.addText(introText, { x: 5.2, y: 0.9, w: 4.5, h: 0.8, fontSize: 11, color: DARK_TEXT, fontFace: 'Arial', lineSpacingMultiple: 1.4 })
    slide5.addText(totalText, { x: 5.2, y: 1.7, w: 4.5, h: 0.8, fontSize: 11, color: DARK_TEXT, fontFace: 'Arial', lineSpacingMultiple: 1.4 })
    slide5.addText(bulletPoints.map(b => `•   ${b}`).join('\n'), { x: 5.2, y: 2.6, w: 4.5, h: 1.8, fontSize: 11, color: DARK_TEXT, fontFace: 'Arial', lineSpacingMultiple: 1.5 })

    // ===== SLIDE 6: MEDIA SOURCES - MONTHLY TREND (Clustered bar chart) =====
    const slide6 = pptx.addSlide()
    addSlideHeader(pptx, slide6, 'Media Sources – Monthly Trend (Industry)', clientName, logoBase64)

    if (monthlyTrend && monthlyTrend.length > 0) {
      slide6.addChart(CHART_BAR, [
        { name: 'Print Media', labels: monthlyTrend.map((m: any) => m.month), values: monthlyTrend.map((m: any) => m.print) },
        { name: 'News Website', labels: monthlyTrend.map((m: any) => m.month), values: monthlyTrend.map((m: any) => m.web) },
        { name: 'TV', labels: monthlyTrend.map((m: any) => m.month), values: monthlyTrend.map((m: any) => m.tv) },
        { name: 'Radio', labels: monthlyTrend.map((m: any) => m.month), values: monthlyTrend.map((m: any) => m.radio) },
      ], {
        x: 0.3, y: 0.8, w: 5, h: 3.8,
        barGrouping: 'clustered',
        showLegend: true, legendPos: 't', legendFontSize: 8,
        showValue: true, dataLabelFontSize: 7,
        chartColors: [BLACK, ORANGE, PURPLE, GRAY_TEXT],
        catAxisOrientation: 'minMax',
      })

      const highestMonth = monthlyTrend.reduce((max: any, m: any) => m.total > max.total ? m : max, monthlyTrend[0])
      const lowestMonth = monthlyTrend.reduce((min: any, m: any) => m.total < min.total ? m : min, monthlyTrend[0])
      slide6.addText('Period Under Review', { x: 5.5, y: 1.0, w: 4.2, h: 0.5, fontSize: 16, color: DARK_TEXT, fontFace: 'Arial', bold: true })
      slide6.addText(`${highestMonth?.month} – ${highestMonth?.total?.toLocaleString()} articles`, { x: 5.5, y: 1.7, w: 4.2, h: 0.4, fontSize: 12, color: GREEN, fontFace: 'Arial', bold: true })
      slide6.addText('(Highest)', { x: 5.5, y: 2.1, w: 4.2, h: 0.3, fontSize: 10, color: GRAY_TEXT, fontFace: 'Arial' })
      slide6.addText(`${lowestMonth?.month} – ${lowestMonth?.total?.toLocaleString()} articles`, { x: 5.5, y: 2.6, w: 4.2, h: 0.4, fontSize: 12, color: RED, fontFace: 'Arial', bold: true })
      slide6.addText('(Lowest)', { x: 5.5, y: 3.0, w: 4.2, h: 0.3, fontSize: 10, color: GRAY_TEXT, fontFace: 'Arial' })
    }

    // ===== SLIDE 7: THEMATIC AREAS / WORD CLOUD =====
    const slide7 = pptx.addSlide()
    addSlideHeader(pptx, slide7, 'Thematic Areas of Coverage - Industry', clientName, logoBase64)

    if (thematicAreas && thematicAreas.length > 0) {
      const cloudItems = thematicAreas.slice(0, 20)
      const maxWeight = Math.max(...cloudItems.map((item: any) => item.weight), 1)
      const positions = [
        { x: 4.5, y: 1.2 }, { x: 3.0, y: 1.8 }, { x: 6.0, y: 1.5 }, { x: 1.5, y: 2.2 },
        { x: 4.5, y: 2.5 }, { x: 7.0, y: 2.2 }, { x: 2.5, y: 3.0 }, { x: 5.0, y: 3.3 },
        { x: 6.5, y: 3.0 }, { x: 3.5, y: 3.8 }, { x: 5.5, y: 4.0 }, { x: 2.0, y: 4.0 },
        { x: 7.5, y: 3.8 }, { x: 4.0, y: 4.5 }, { x: 1.0, y: 3.2 }, { x: 8.0, y: 2.8 },
        { x: 3.0, y: 4.8 }, { x: 6.0, y: 4.6 }, { x: 4.5, y: 2.0 }, { x: 7.0, y: 4.3 },
      ]
      cloudItems.forEach((item: any, i: number) => {
        const ratio = item.weight / maxWeight
        const fontSize = Math.max(10, Math.min(36, 10 + Math.round(ratio * 26)))
        const color = ratio > 0.6 ? GOLD : ratio > 0.3 ? DARK_TEXT : GRAY_TEXT
        const pos = positions[i] || { x: 4.5, y: 2.8 }
        slide7.addText(item.keyword, { x: pos.x, y: pos.y, w: 3, h: 0.5, fontSize, color, fontFace: 'Arial', bold: ratio > 0.5, align: 'center' })
      })
    }

    // ===== SLIDE 8: KEY JOURNALISTS - TOP 5 =====
    const slide8 = pptx.addSlide()
    addSlideHeader(pptx, slide8, 'Key Journalists – Top 5', clientName, logoBase64)

    if (topJournalists && topJournalists.length > 0) {
      const top5 = topJournalists.slice(0, 5)
      const maxCount = Math.max(...top5.map((j: any) => j.count), 1)
      top5.forEach((j: any, i: number) => {
        const barX = 1.0 + i * 1.8
        const barWidth = 1.4
        const maxBarHeight = 3.0
        const barHeight = (j.count / maxCount) * maxBarHeight
        const barY = 1.0 + (maxBarHeight - barHeight)
        slide8.addText(j.count.toString(), { x: barX, y: barY - 0.35, w: barWidth, h: 0.3, fontSize: 12, color: DARK_TEXT, fontFace: 'Arial', align: 'center', bold: true })
        slide8.addShape(pptx.ShapeType.rect, { x: barX, y: barY, w: barWidth, h: barHeight, fill: { color: BLACK } })
        slide8.addText(`${j.name},\n${j.outlet}`, { x: barX - 0.1, y: 4.1, w: barWidth + 0.2, h: 0.9, fontSize: 9, color: DARK_TEXT, fontFace: 'Arial', align: 'center' })
      })
    }

    // ===== SLIDE 9: SECTION DIVIDER - Visibility of Client =====
    addSectionDivider(pptx, `Visibility of ${clientName}`, clientName, logoBase64)

    // ===== SLIDE 10: CLIENT VISIBILITY (Donut + Sources + Trend) =====
    const slide10 = pptx.addSlide()
    addSlideHeader(pptx, slide10, `Client Visibility — ${clientName}`, clientName, logoBase64)

    // Organization visibility donut chart (left side)
    if (orgVisibility && orgVisibility.length > 0) {
      slide10.addChart(CHART_DOUGHNUT, [
        { name: 'Organization Visibility', labels: orgVisibility.map((o: any) => o.name), values: orgVisibility.map((o: any) => o.mentions) }
      ], {
        x: 0.2, y: 0.8, w: 4.5, h: 3.5,
        showLegend: true, legendPos: 'b', legendFontSize: 8,
        showValue: true, dataLabelFontSize: 9,
        chartColors: [BLACK, ORANGE, RED, BLUE, GRAY_TEXT],
      })
    }

    // Sources of Mentions bar chart (top-right)
    slide10.addText(`Sources of Mentions - ${clientName}`, { x: 5, y: 0.7, w: 4.8, h: 0.3, fontSize: 10, color: DARK_TEXT, fontFace: 'Arial', bold: true })
    if (clientSourcesOfMentions) {
      slide10.addChart(CHART_BAR, [
        { name: 'Mentions', labels: ['Print Media', 'News Website', 'TV', 'Radio'], values: [clientSourcesOfMentions.printMedia, clientSourcesOfMentions.newsWebsite, clientSourcesOfMentions.tv, clientSourcesOfMentions.radio] }
      ], {
        x: 5, y: 1.0, w: 4.8, h: 1.8,
        showValue: true, dataLabelFontSize: 9,
        chartColors: [ORANGE],
        valAxisHidden: true, catAxisLabelFontSize: 8,
      })
    }

    // Trend of Mentions bar chart (bottom-right)
    slide10.addText(`Trend of Mentions - ${clientName}`, { x: 5, y: 3.0, w: 4.8, h: 0.3, fontSize: 10, color: DARK_TEXT, fontFace: 'Arial', bold: true })
    if (clientMonthlyTrend && clientMonthlyTrend.length > 0) {
      slide10.addChart(CHART_BAR, [
        { name: 'Mentions', labels: clientMonthlyTrend.map((m: any) => m.month), values: clientMonthlyTrend.map((m: any) => m.count) }
      ], {
        x: 5, y: 3.3, w: 4.8, h: 1.5,
        showValue: true, dataLabelFontSize: 9,
        chartColors: [RED],
        valAxisHidden: true, catAxisLabelFontSize: 8,
      })
    }

    // ===== SLIDE 11: MAJOR STORIES - CLIENT =====
    const slide11 = pptx.addSlide()
    addSlideHeader(pptx, slide11, `Major Stories – ${clientName}`, clientName, logoBase64)

    if (clientMajorStories && clientMajorStories.length > 0) {
      const leftStories = clientMajorStories.slice(0, 3)
      const rightStories = clientMajorStories.slice(3, 6)

      leftStories.forEach((story: any, i: number) => {
        const y = 0.8 + i * 1.4
        slide11.addText(story.date, { x: 0.4, y, w: 4.5, h: 0.25, fontSize: 9, color: ORANGE, fontFace: 'Arial', bold: true })
        slide11.addText(story.title, { x: 0.4, y: y + 0.25, w: 4.5, h: 0.3, fontSize: 10, color: DARK_TEXT, fontFace: 'Arial', bold: true })
        slide11.addText(story.summary?.substring(0, 200) || '', { x: 0.4, y: y + 0.55, w: 4.5, h: 0.7, fontSize: 8, color: GRAY_TEXT, fontFace: 'Arial' })
      })

      rightStories.forEach((story: any, i: number) => {
        const y = 0.8 + i * 1.4
        slide11.addText(story.date, { x: 5.2, y, w: 4.5, h: 0.25, fontSize: 9, color: ORANGE, fontFace: 'Arial', bold: true })
        slide11.addText(story.title, { x: 5.2, y: y + 0.25, w: 4.5, h: 0.3, fontSize: 10, color: DARK_TEXT, fontFace: 'Arial', bold: true })
        slide11.addText(story.summary?.substring(0, 200) || '', { x: 5.2, y: y + 0.55, w: 4.5, h: 0.7, fontSize: 8, color: GRAY_TEXT, fontFace: 'Arial' })
      })
    }

    // ===== SLIDE 12: SECTION DIVIDER - Competitors =====
    addSectionDivider(pptx, 'Visibility of\nCompetitors', clientName, logoBase64)

    // ===== SLIDE 13: COMPETITOR PRESENCE - TOP 5 SECTOR PLAYERS =====
    const slide13 = pptx.addSlide()
    addSlideHeader(pptx, slide13, 'Competitor Presence – Top 5 Sector Players', clientName, logoBase64)

    if (competitorAnalysis && competitorAnalysis.length > 0) {
      const topCompetitors = competitorAnalysis.slice(0, 5)
      const totalMentions = topCompetitors.reduce((sum: number, c: any) => sum + c.mentions, 0)

      slide13.addChart(CHART_PIE, [
        { name: 'Competitor Presence', labels: topCompetitors.map((c: any) => c.name), values: topCompetitors.map((c: any) => c.mentions) }
      ], {
        x: 0.2, y: 0.8, w: 5, h: 3.8,
        showLegend: true, legendPos: 'b', legendFontSize: 9,
        showValue: true, showPercent: false,
        dataLabelPosition: 'outEnd', dataLabelFontSize: 10,
        chartColors: [GRAY_TEXT, BLUE, ORANGE, BLACK, PURPLE],
      })

      const topPlayer = topCompetitors[0]
      slide13.addText(
        `Overall, the presence of companies in the media remained competitive. A total of ${totalMentions.toLocaleString()} mentions.\n\n${topPlayer?.name} (${topPlayer?.mentions}) had the highest mentions.`,
        { x: 5.5, y: 1.2, w: 4.2, h: 3, fontSize: 11, color: DARK_TEXT, fontFace: 'Arial', lineSpacingMultiple: 1.4 }
      )
    } else {
      slide13.addText('No competitor data available. Add competitors to the client profile to populate this slide.', {
        x: 1, y: 2, w: 8, h: 1, fontSize: 14, color: LIGHT_GRAY, fontFace: 'Arial', align: 'center',
      })
    }

    // ===== SLIDES: MAJOR STORIES PER COMPETITOR =====
    if (competitorAnalysis && competitorAnalysis.length > 0) {
      competitorAnalysis.slice(0, 5).forEach((competitor: any) => {
        if (competitor.majorStories && competitor.majorStories.length > 0) {
          const compSlide = pptx.addSlide()
          addSlideHeader(pptx, compSlide, `Major Stories – ${competitor.name}`, clientName, logoBase64)

          const leftStories = competitor.majorStories.slice(0, 3)
          const rightStories = competitor.majorStories.slice(3, 6)

          leftStories.forEach((story: any, i: number) => {
            const y = 0.8 + i * 1.4
            compSlide.addText(story.date, { x: 0.4, y, w: 4.5, h: 0.25, fontSize: 9, color: ORANGE, fontFace: 'Arial', bold: true })
            compSlide.addText(story.title, { x: 0.4, y: y + 0.25, w: 4.5, h: 0.3, fontSize: 10, color: DARK_TEXT, fontFace: 'Arial', bold: true })
            compSlide.addText(story.summary?.substring(0, 200) || '', { x: 0.4, y: y + 0.55, w: 4.5, h: 0.7, fontSize: 8, color: GRAY_TEXT, fontFace: 'Arial' })
          })

          rightStories.forEach((story: any, i: number) => {
            const y = 0.8 + i * 1.4
            compSlide.addText(story.date, { x: 5.2, y, w: 4.5, h: 0.25, fontSize: 9, color: ORANGE, fontFace: 'Arial', bold: true })
            compSlide.addText(story.title, { x: 5.2, y: y + 0.25, w: 4.5, h: 0.3, fontSize: 10, color: DARK_TEXT, fontFace: 'Arial', bold: true })
            compSlide.addText(story.summary?.substring(0, 200) || '', { x: 5.2, y: y + 0.55, w: 4.5, h: 0.7, fontSize: 8, color: GRAY_TEXT, fontFace: 'Arial' })
          })
        }
      })
    }

    // ===== SLIDE: STORY ORIENTATION - SENTIMENTS =====
    const slideSent = pptx.addSlide()
    addSlideHeader(pptx, slideSent, 'Story Orientation - Sentiments', clientName, logoBase64)

    if (industrySentiment) {
      // Industry sentiment pie chart (left)
      slideSent.addChart(CHART_PIE, [
        { name: 'Sentiment', labels: ['Positive', 'Negative', 'Neutral'], values: [industrySentiment.positive.count, industrySentiment.negative.count, industrySentiment.neutral.count] }
      ], {
        x: 0.2, y: 0.8, w: 4, h: 3,
        showLegend: true, legendPos: 'b', legendFontSize: 9,
        showPercent: true, dataLabelFontSize: 10,
        chartColors: [GREEN, BLACK, GRAY_TEXT],
      })

      // Client sentiment bars (right)
      if (clientSentiment) {
        slideSent.addText(`${clientName} Sentiment`, { x: 5, y: 0.7, w: 4.8, h: 0.3, fontSize: 11, color: DARK_TEXT, fontFace: 'Arial', bold: true })
        slideSent.addChart(CHART_BAR, [
          { name: 'Client Sentiment', labels: ['Positive', 'Negative', 'Neutral'], values: [clientSentiment.positive, clientSentiment.negative, clientSentiment.neutral] }
        ], {
          x: 4.8, y: 1.0, w: 5, h: 2.5,
          showValue: true, dataLabelFontSize: 10,
          chartColors: [GREEN, RED, YELLOW],
          valAxisHidden: true, catAxisLabelFontSize: 10,
        })
      }

      // Summary bullets
      const sentTotal = industrySentiment.positive.count + industrySentiment.negative.count + industrySentiment.neutral.count
      slideSent.addText(
        [
          `• Overall, out of ${sentTotal.toLocaleString()} news stories, majority (${industrySentiment.positive.percentage}%) were of positive sentiments.`,
          `• Another (${industrySentiment.negative.percentage}%) were negative.`,
          `• ${industrySentiment.neutral.percentage}% were neutral.`,
        ].join('\n'),
        { x: 0.5, y: 4.0, w: 9, h: 1, fontSize: 10, color: DARK_TEXT, fontFace: 'Arial', lineSpacingMultiple: 1.3 }
      )
    }

    // ===== SLIDE: KEY TAKEOUTS - CONCLUSIONS =====
    // Render all takeouts across pages, 6 per page with tighter spacing
    const takeoutPages: string[][] = []
    if (keyTakeouts && keyTakeouts.length > 0) {
      for (let i = 0; i < keyTakeouts.length; i += 6) {
        takeoutPages.push(keyTakeouts.slice(i, i + 6))
      }
    }

    takeoutPages.forEach((pageTakeouts: string[]) => {
      const ktSlide = pptx.addSlide()
      ktSlide.addText('Key Takeouts - Conclusions', { x: 0.5, y: 0.2, w: 8, h: 0.5, fontSize: 22, bold: true, color: ORANGE, fontFace: 'Arial' })
      ktSlide.addText('Ovaview', { x: 8.5, y: 0.2, w: 1.3, h: 0.4, fontSize: 10, color: ORANGE, align: 'right', fontFace: 'Arial', bold: true })

      pageTakeouts.forEach((takeout: string, i: number) => {
        const y = 0.9 + i * 0.72
        const color = i % 2 === 1 ? ORANGE : DARK_TEXT
        ktSlide.addText(`>  ${takeout}`, { x: 0.6, y, w: 8.8, h: 0.65, fontSize: 12, color, fontFace: 'Arial', lineSpacingMultiple: 1.2, valign: 'top' })
      })
    })

    // Generate the PPTX as base64
    const pptxBase64 = await pptx.write({ outputType: 'base64' }) as string

    return NextResponse.json({
      data: pptxBase64,
      filename: `${clientName.replace(/\s+/g, '_')}_PR_Presence_Analysis_${dateRangeLabel.replace(/\s+/g, '_')}.pptx`,
    })
  } catch (error) {
    console.error('PR Presence PPTX export error:', error)
    return NextResponse.json({ error: 'Failed to generate PR Presence PPTX' }, { status: 500 })
  }
}
