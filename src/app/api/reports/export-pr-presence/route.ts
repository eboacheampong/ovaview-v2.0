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

type SlideType = ReturnType<PptxGenJS['addSlide']>

// Helper: Add gold header bar with title
function addSlideHeader(pptx: PptxGenJS, slide: SlideType, title: string, clientName?: string) {
  // Gold header bar
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: GOLD } })
  slide.addText(title, { x: 0.4, y: 0.08, w: 7, h: 0.45, fontSize: 22, color: WHITE, fontFace: 'Arial' })
  // Client name top-right
  if (clientName) {
    slide.addText(clientName, { x: 7.5, y: 0.08, w: 2.3, h: 0.45, fontSize: 10, color: WHITE, align: 'right', fontFace: 'Arial', bold: true })
  }
  // Ovaview footer
  slide.addText('Ovaview', { x: 0.3, y: 5.1, w: 1.5, h: 0.3, fontSize: 8, color: ORANGE, fontFace: 'Arial', bold: true })
}

// Helper: Section divider slide (gold background)
function addSectionDivider(pptx: PptxGenJS, title: string, clientName?: string) {
  const slide = pptx.addSlide()
  slide.background = { fill: GOLD }
  slide.addText(title, { x: 0.5, y: 1.8, w: 9, h: 1.2, fontSize: 36, color: WHITE, bold: true, align: 'center', fontFace: 'Arial' })
  if (clientName) {
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
    if (clientName) {
      slide1.addText(clientName, { x: 7, y: 0.2, w: 2.8, h: 0.5, fontSize: 12, color: WHITE, align: 'right', fontFace: 'Arial', bold: true })
    }

    // ===== SLIDE 2: BRIEF =====
    const slide2 = pptx.addSlide()
    addSlideHeader(pptx, slide2, 'Brief')
    slide2.addText(
      `This report is an analysis of the PR presence for\n${clientName}\nThe data was captured from ${dateRangeLabel}.`,
      { x: 1, y: 1.5, w: 7.5, h: 2, fontSize: 20, color: GRAY_TEXT, fontFace: 'Arial', lineSpacingMultiple: 1.5 }
    )
    // Highlight client name
    slide2.addText(clientName, { x: 1, y: 2.15, w: 7.5, h: 0.5, fontSize: 20, color: DARK_TEXT, bold: true, fontFace: 'Arial' })

    // ===== SLIDE 3: SECTION DIVIDER - Industry =====
    addSectionDivider(pptx, `MEDIA PRESENCE ANALYSIS\nIndustry`, clientName)

    // ===== SLIDE 4: SCOPE OF COVERAGE - OVERALL =====
    const slide4 = pptx.addSlide()
    addSlideHeader(pptx, slide4, 'Scope of Coverage - Overall', clientName)

    const scopeItems = [
      { label: 'News Website', count: scopeOfCoverage.newsWebsite.count, desc: scopeOfCoverage.newsWebsite.description },
      { label: 'Print Media', count: scopeOfCoverage.printMedia.count, desc: scopeOfCoverage.printMedia.description },
      { label: 'Radio', count: scopeOfCoverage.radio.count, desc: scopeOfCoverage.radio.description },
      { label: 'Television', count: scopeOfCoverage.television.count, desc: scopeOfCoverage.television.description },
    ]

    scopeItems.forEach((item, i) => {
      const x = 0.3 + i * 2.4
      // Donut circle representation
      slide4.addShape(pptx.ShapeType.ellipse, { x: x + 0.4, y: 1.0, w: 1.2, h: 1.2, line: { color: GOLD, width: 4 } })
      slide4.addText(item.count.toString(), { x: x + 0.4, y: 1.25, w: 1.2, h: 0.7, fontSize: 24, bold: true, color: DARK_TEXT, align: 'center', fontFace: 'Arial' })
      slide4.addText(item.label, { x: x, y: 2.4, w: 2, h: 0.4, fontSize: 12, color: DARK_TEXT, align: 'center', fontFace: 'Arial', bold: true })
      slide4.addText(item.desc, { x: x, y: 2.8, w: 2, h: 1, fontSize: 8, color: GRAY_TEXT, align: 'center', fontFace: 'Arial' })
    })

    // ===== SLIDE 5: MEDIA SOURCES - INDUSTRY (Pie chart) =====
    const slide5 = pptx.addSlide()
    addSlideHeader(pptx, slide5, 'Media Sources - Industry', clientName)

    // Pie chart data
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
      chartColors: [ORANGE, BLACK, 'C084FC', GRAY_TEXT],
    })

    // Text summary on the right
    const summaryText = `Total Coverage – ${totalIndustryStories.toLocaleString()} news stories from four media sources (print media, news website, radio and television).\n\n• News websites – ${mediaSourcesIndustry.newsWebsite.percentage}%\n• Print media – ${mediaSourcesIndustry.printMedia.percentage}%\n• Radio – ${mediaSourcesIndustry.radio.percentage}%\n• TV – ${mediaSourcesIndustry.tv.percentage}%`
    slide5.addText(summaryText, { x: 5.2, y: 1.0, w: 4.5, h: 3, fontSize: 11, color: DARK_TEXT, fontFace: 'Arial', lineSpacingMultiple: 1.4 })

    // ===== SLIDE 6: MEDIA SOURCES - MONTHLY TREND =====
    const slide6 = pptx.addSlide()
    addSlideHeader(pptx, slide6, 'Media Sources – Monthly Trend (Industry)', clientName)

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
        chartColors: [BLACK, ORANGE, 'C084FC', GRAY_TEXT],
        catAxisOrientation: 'minMax',
      })
    }

    // Monthly analysis text
    const highestMonth = monthlyTrend?.reduce((max: any, m: any) => m.total > max.total ? m : max, monthlyTrend[0])
    const lowestMonth = monthlyTrend?.reduce((min: any, m: any) => m.total < min.total ? m : min, monthlyTrend[0])
    const trendText = `Period Under Review\n\n${highestMonth?.month} – ${highestMonth?.total?.toLocaleString()} articles (Highest)\n${lowestMonth?.month} – ${lowestMonth?.total?.toLocaleString()} articles (Least)`
    slide6.addText(trendText, { x: 5.5, y: 1.0, w: 4.2, h: 3, fontSize: 11, color: DARK_TEXT, fontFace: 'Arial', lineSpacingMultiple: 1.4 })

    // ===== SLIDE 7: THEMATIC AREAS / WORD CLOUD =====
    const slide7 = pptx.addSlide()
    addSlideHeader(pptx, slide7, 'Thematic Areas of Coverage - Industry', clientName)

    if (thematicAreas && thematicAreas.length > 0) {
      // Simulate word cloud with positioned text at varying sizes
      const cloudItems = thematicAreas.slice(0, 20)
      const positions = [
        { x: 2.5, y: 1.2 }, { x: 4.5, y: 1.5 }, { x: 1.5, y: 2.0 }, { x: 6.0, y: 1.8 },
        { x: 3.0, y: 2.5 }, { x: 5.5, y: 2.3 }, { x: 1.0, y: 3.0 }, { x: 7.0, y: 2.8 },
        { x: 2.0, y: 3.3 }, { x: 4.0, y: 3.0 }, { x: 6.5, y: 3.3 }, { x: 3.5, y: 3.6 },
        { x: 1.5, y: 3.8 }, { x: 5.0, y: 3.8 }, { x: 7.5, y: 3.5 }, { x: 2.5, y: 4.0 },
        { x: 4.5, y: 4.2 }, { x: 6.0, y: 4.0 }, { x: 3.0, y: 4.4 }, { x: 5.5, y: 4.4 },
      ]

      cloudItems.forEach((item: any, i: number) => {
        const fontSize = Math.max(8, Math.min(28, 8 + Math.round(item.weight * 0.2)))
        const color = item.weight > 60 ? ORANGE : item.weight > 30 ? DARK_TEXT : GRAY_TEXT
        const pos = positions[i] || { x: 3 + (i % 4) * 1.5, y: 1.5 + Math.floor(i / 4) * 0.8 }
        slide7.addText(item.keyword, {
          x: pos.x, y: pos.y, w: 2.5, h: 0.5,
          fontSize, color, fontFace: 'Arial', bold: item.weight > 50,
        })
      })
    }

    // ===== SLIDE 8: KEY PERSONALITIES (INDUSTRY) - TOP 5 =====
    // Note: We don't have personality photos in the DB, so we'll use a card layout
    const slide8 = pptx.addSlide()
    addSlideHeader(pptx, slide8, 'Key Personalities (Industry) – Top 5', clientName)
    slide8.addText('Key personalities data is populated from story mentions. Photos can be added manually.', {
      x: 0.5, y: 1.5, w: 9, h: 0.5, fontSize: 11, color: LIGHT_GRAY, fontFace: 'Arial', italic: true,
    })

    // ===== SLIDE 9: KEY PERSONALITIES (CLIENT) - TOP 5 =====
    const slide9 = pptx.addSlide()
    addSlideHeader(pptx, slide9, `Key Personalities (${clientName}) – Top 5`, clientName)
    slide9.addText('Key personalities data is populated from story mentions. Photos can be added manually.', {
      x: 0.5, y: 1.5, w: 9, h: 0.5, fontSize: 11, color: LIGHT_GRAY, fontFace: 'Arial', italic: true,
    })

    // ===== SLIDE 10: KEY JOURNALISTS - TOP 5 =====
    const slide10 = pptx.addSlide()
    addSlideHeader(pptx, slide10, 'Key Journalists – Top 5', clientName)

    if (topJournalists && topJournalists.length > 0) {
      slide10.addChart(CHART_BAR, [
        {
          name: 'Articles',
          labels: topJournalists.map((j: any) => `${j.name}\n${j.outlet}`),
          values: topJournalists.map((j: any) => j.count),
        }
      ], {
        x: 0.5, y: 0.9, w: 9, h: 3.8,
        barDir: 'bar',
        showValue: true, dataLabelFontSize: 10,
        chartColors: [BLACK],
        catAxisOrientation: 'maxMin',
        valAxisHidden: true,
        catAxisFontSize: 9,
      })
    }

    // ===== SLIDE 11: SECTION DIVIDER - Visibility of Client =====
    addSectionDivider(pptx, `Visibility of ${clientName}`, clientName)

    // ===== SLIDE 12: CLIENT VISIBILITY (Donut + Sources + Trend) =====
    const slide12 = pptx.addSlide()
    addSlideHeader(pptx, slide12, 'Media Sources - Industry', clientName)

    // Organization visibility donut chart (left side)
    if (orgVisibility && orgVisibility.length > 0) {
      slide12.addChart(CHART_DOUGHNUT, [
        {
          name: 'Organization Visibility',
          labels: orgVisibility.map((o: any) => o.name),
          values: orgVisibility.map((o: any) => o.mentions),
        }
      ], {
        x: 0.2, y: 0.8, w: 4.5, h: 3.5,
        showLegend: true, legendPos: 'b', legendFontSize: 8,
        showValue: true, dataLabelFontSize: 9,
        chartColors: [BLACK, ORANGE, RED, BLUE, GRAY_TEXT],
      })
    }

    // Sources of Mentions bar chart (top-right)
    slide12.addText(`Sources of Mentions - ${clientName}`, { x: 5, y: 0.7, w: 4.8, h: 0.3, fontSize: 10, color: DARK_TEXT, fontFace: 'Arial', bold: true })
    if (clientSourcesOfMentions) {
      slide12.addChart(CHART_BAR, [
        {
          name: 'Mentions',
          labels: ['Print Media', 'News Website', 'TV', 'Radio'],
          values: [clientSourcesOfMentions.printMedia, clientSourcesOfMentions.newsWebsite, clientSourcesOfMentions.tv, clientSourcesOfMentions.radio],
        }
      ], {
        x: 5, y: 1.0, w: 4.8, h: 1.8,
        showValue: true, dataLabelFontSize: 9,
        chartColors: [ORANGE],
        valAxisHidden: true,
        catAxisFontSize: 8,
      })
    }

    // Trend of Mentions bar chart (bottom-right)
    slide12.addText(`Trend of Mentions - ${clientName}`, { x: 5, y: 3.0, w: 4.8, h: 0.3, fontSize: 10, color: DARK_TEXT, fontFace: 'Arial', bold: true })
    if (clientMonthlyTrend && clientMonthlyTrend.length > 0) {
      slide12.addChart(CHART_BAR, [
        {
          name: 'Mentions',
          labels: clientMonthlyTrend.map((m: any) => m.month),
          values: clientMonthlyTrend.map((m: any) => m.count),
        }
      ], {
        x: 5, y: 3.3, w: 4.8, h: 1.5,
        showValue: true, dataLabelFontSize: 9,
        chartColors: [RED],
        valAxisHidden: true,
        catAxisFontSize: 8,
      })
    }

    // ===== SLIDE 13: MAJOR STORIES - CLIENT =====
    const slide13 = pptx.addSlide()
    addSlideHeader(pptx, slide13, `Major Stories – ${clientName}`, clientName)

    if (clientMajorStories && clientMajorStories.length > 0) {
      const leftStories = clientMajorStories.slice(0, 3)
      const rightStories = clientMajorStories.slice(3, 6)

      leftStories.forEach((story: any, i: number) => {
        const y = 0.8 + i * 1.4
        slide13.addText(story.date, { x: 0.4, y, w: 4.5, h: 0.25, fontSize: 9, color: DARK_TEXT, fontFace: 'Arial', bold: true })
        slide13.addText(story.title, { x: 0.4, y: y + 0.25, w: 4.5, h: 0.3, fontSize: 10, color: DARK_TEXT, fontFace: 'Arial', bold: true, underline: true })
        slide13.addText(story.summary?.substring(0, 200) || '', { x: 0.4, y: y + 0.55, w: 4.5, h: 0.7, fontSize: 8, color: GRAY_TEXT, fontFace: 'Arial' })
      })

      rightStories.forEach((story: any, i: number) => {
        const y = 0.8 + i * 1.4
        slide13.addText(story.date, { x: 5.2, y, w: 4.5, h: 0.25, fontSize: 9, color: DARK_TEXT, fontFace: 'Arial', bold: true })
        slide13.addText(story.title, { x: 5.2, y: y + 0.25, w: 4.5, h: 0.3, fontSize: 10, color: DARK_TEXT, fontFace: 'Arial', bold: true, underline: true })
        slide13.addText(story.summary?.substring(0, 200) || '', { x: 5.2, y: y + 0.55, w: 4.5, h: 0.7, fontSize: 8, color: GRAY_TEXT, fontFace: 'Arial' })
      })
    }

    // ===== SLIDE 14: SECTION DIVIDER - Visibility of Mining Companies =====
    addSectionDivider(pptx, 'Visibility of\nCompetitors', clientName)

    // ===== SLIDE 15: COMPETITOR PRESENCE - TOP 5 SECTOR PLAYERS =====
    const slide15 = pptx.addSlide()
    addSlideHeader(pptx, slide15, 'Competitor Presence – Top 5 Sector Players', clientName)

    if (competitorAnalysis && competitorAnalysis.length > 0) {
      const topCompetitors = competitorAnalysis.slice(0, 5)
      const totalMentions = topCompetitors.reduce((sum: number, c: any) => sum + c.mentions, 0)

      slide15.addChart(CHART_PIE, [
        {
          name: 'Competitor Presence',
          labels: topCompetitors.map((c: any) => c.name),
          values: topCompetitors.map((c: any) => c.mentions),
        }
      ], {
        x: 0.2, y: 0.8, w: 5, h: 3.8,
        showLegend: true, legendPos: 'b', legendFontSize: 9,
        showValue: true, showPercent: false,
        dataLabelPosition: 'outEnd', dataLabelFontSize: 10,
        chartColors: [GRAY_TEXT, BLUE, ORANGE, BLACK, 'C084FC'],
      })

      // Text summary on the right
      const topPlayer = topCompetitors[0]
      const compSummary = `Overall, the presence of companies in the media remained competitive. A total of ${totalMentions.toLocaleString()} mentions.\n\n${topPlayer?.name} (${topPlayer?.mentions}) had the highest mentions.`
      slide15.addText(compSummary, { x: 5.5, y: 1.2, w: 4.2, h: 3, fontSize: 11, color: DARK_TEXT, fontFace: 'Arial', lineSpacingMultiple: 1.4 })
    } else {
      slide15.addText('No competitor data available. Add competitors to the client profile to populate this slide.', {
        x: 1, y: 2, w: 8, h: 1, fontSize: 14, color: LIGHT_GRAY, fontFace: 'Arial', align: 'center',
      })
    }

    // ===== SLIDES 16-20: MAJOR STORIES PER COMPETITOR =====
    if (competitorAnalysis && competitorAnalysis.length > 0) {
      competitorAnalysis.slice(0, 5).forEach((competitor: any) => {
        if (competitor.majorStories && competitor.majorStories.length > 0) {
          const compSlide = pptx.addSlide()
          addSlideHeader(pptx, compSlide, `Major Stories – ${competitor.name}`, clientName)

          const leftStories = competitor.majorStories.slice(0, 3)
          const rightStories = competitor.majorStories.slice(3, 6)

          leftStories.forEach((story: any, i: number) => {
            const y = 0.8 + i * 1.4
            compSlide.addText(story.date, { x: 0.4, y, w: 4.5, h: 0.25, fontSize: 9, color: DARK_TEXT, fontFace: 'Arial', bold: true })
            compSlide.addText(story.title, { x: 0.4, y: y + 0.25, w: 4.5, h: 0.3, fontSize: 10, color: DARK_TEXT, fontFace: 'Arial', bold: true, underline: true })
            compSlide.addText(story.summary?.substring(0, 200) || '', { x: 0.4, y: y + 0.55, w: 4.5, h: 0.7, fontSize: 8, color: GRAY_TEXT, fontFace: 'Arial' })
          })

          rightStories.forEach((story: any, i: number) => {
            const y = 0.8 + i * 1.4
            compSlide.addText(story.date, { x: 5.2, y, w: 4.5, h: 0.25, fontSize: 9, color: DARK_TEXT, fontFace: 'Arial', bold: true })
            compSlide.addText(story.title, { x: 5.2, y: y + 0.25, w: 4.5, h: 0.3, fontSize: 10, color: DARK_TEXT, fontFace: 'Arial', bold: true, underline: true })
            compSlide.addText(story.summary?.substring(0, 200) || '', { x: 5.2, y: y + 0.55, w: 4.5, h: 0.7, fontSize: 8, color: GRAY_TEXT, fontFace: 'Arial' })
          })
        }
      })
    }

    // ===== SLIDE 21: STORY ORIENTATION - SENTIMENTS =====
    const slide21 = pptx.addSlide()
    addSlideHeader(pptx, slide21, 'Story Orientation - Sentiments', clientName)

    if (industrySentiment) {
      // Sentiment pie chart (left)
      slide21.addChart(CHART_PIE, [
        {
          name: 'Sentiment',
          labels: ['Positive', 'Negative', 'Neutral'],
          values: [industrySentiment.positive.count, industrySentiment.negative.count, industrySentiment.neutral.count],
        }
      ], {
        x: 0.2, y: 0.8, w: 4, h: 3,
        showLegend: true, legendPos: 'b', legendFontSize: 9,
        showPercent: true, dataLabelFontSize: 10,
        chartColors: [GREEN, BLACK, GRAY_TEXT],
      })

      // Sentiment bars for client (right)
      if (clientSentiment) {
        slide21.addChart(CHART_BAR, [
          {
            name: 'Client Sentiment',
            labels: ['Positive', 'Negative', 'Neutral'],
            values: [clientSentiment.positive, clientSentiment.negative, clientSentiment.neutral],
          }
        ], {
          x: 4.8, y: 0.8, w: 5, h: 2.5,
          showValue: true, dataLabelFontSize: 10,
          chartColors: [GREEN, RED, YELLOW],
          valAxisHidden: true,
          catAxisFontSize: 10,
        })
      }

      // Summary bullets
      const sentTotal = industrySentiment.positive.count + industrySentiment.negative.count + industrySentiment.neutral.count
      const sentimentBullets = [
        `Overall, out of ${sentTotal.toLocaleString()} news stories, majority (${industrySentiment.positive.percentage}%) were of positive sentiments.`,
        `Another (${industrySentiment.negative.percentage}%) were negative.`,
        `${industrySentiment.neutral.percentage}% were neutral.`,
      ]
      slide21.addText(sentimentBullets.map(b => `• ${b}`).join('\n'), {
        x: 0.5, y: 4.0, w: 9, h: 1, fontSize: 10, color: DARK_TEXT, fontFace: 'Arial', lineSpacingMultiple: 1.3,
      })
    }

    // ===== SLIDE 22: KEY TAKEOUTS - CONCLUSIONS (Page 1) =====
    const slide22 = pptx.addSlide()
    slide22.addText('Key Takeouts - Conclusions', { x: 0.5, y: 0.3, w: 8, h: 0.5, fontSize: 24, bold: true, color: ORANGE, fontFace: 'Arial' })
    slide22.addText('Ovaview', { x: 8.5, y: 0.3, w: 1.3, h: 0.4, fontSize: 10, color: ORANGE, align: 'right', fontFace: 'Arial', bold: true })

    if (keyTakeouts && keyTakeouts.length > 0) {
      const takeoutsPage1 = keyTakeouts.slice(0, 4)
      takeoutsPage1.forEach((takeout: string, i: number) => {
        const y = 1.2 + i * 1.0
        const color = i % 2 === 1 ? ORANGE : DARK_TEXT
        slide22.addText(`➤  ${takeout}`, {
          x: 0.8, y, w: 8.5, h: 0.8, fontSize: 13, color, fontFace: 'Arial', lineSpacingMultiple: 1.3,
        })
      })
    }

    // ===== SLIDE 23: KEY TAKEOUTS - CONCLUSIONS (Page 2) =====
    if (keyTakeouts && keyTakeouts.length > 4) {
      const slide23 = pptx.addSlide()
      slide23.addText('Key Takeouts - Conclusions', { x: 0.5, y: 0.3, w: 8, h: 0.5, fontSize: 24, bold: true, color: ORANGE, fontFace: 'Arial' })
      slide23.addText('Ovaview', { x: 8.5, y: 0.3, w: 1.3, h: 0.4, fontSize: 10, color: ORANGE, align: 'right', fontFace: 'Arial', bold: true })

      const takeoutsPage2 = keyTakeouts.slice(4)
      takeoutsPage2.forEach((takeout: string, i: number) => {
        const y = 1.2 + i * 1.0
        const color = i % 2 === 0 ? ORANGE : DARK_TEXT
        slide23.addText(`➤  ${takeout}`, {
          x: 0.8, y, w: 8.5, h: 0.8, fontSize: 13, color, fontFace: 'Arial', lineSpacingMultiple: 1.3,
        })
      })
    }

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
