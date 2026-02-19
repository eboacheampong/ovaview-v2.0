import { NextRequest, NextResponse } from 'next/server'
import PptxGenJS from 'pptxgenjs'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { analyticsData, clientName, dateRangeLabel, mediaFilter } = await request.json()

    if (!analyticsData) {
      return NextResponse.json({ error: 'No analytics data provided' }, { status: 400 })
    }

    const pptx = new PptxGenJS()
    pptx.author = 'Ovaview'
    pptx.title = 'Media Analytics Report'
    pptx.subject = `Analytics for ${clientName}`

    // Title Slide
    const slide1 = pptx.addSlide()
    slide1.addText('Media Analytics Report', { x: 0.5, y: 2, w: 9, h: 1, fontSize: 36, bold: true, color: 'F97316' })
    slide1.addText(clientName, { x: 0.5, y: 3, w: 9, h: 0.5, fontSize: 24, color: '666666' })
    slide1.addText(`Period: ${dateRangeLabel} | Generated: ${new Date().toLocaleDateString()}`, { x: 0.5, y: 3.6, w: 9, h: 0.4, fontSize: 14, color: '999999' })

    // KPI Slide
    const slide2 = pptx.addSlide()
    slide2.addText('Key Performance Indicators', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, bold: true, color: 'F97316' })

    const kpiTableData = [
      ['Total Coverage', analyticsData.kpiData.totalCoverage.toLocaleString(), `${analyticsData.kpiData.coverageChange > 0 ? '+' : ''}${analyticsData.kpiData.coverageChange}%`],
      ['Media Reach', analyticsData.kpiData.totalReach, `${analyticsData.kpiData.reachChange > 0 ? '+' : ''}${analyticsData.kpiData.reachChange}%`],
      ['Avg Sentiment', `${analyticsData.kpiData.avgSentiment}%`, `${analyticsData.kpiData.sentimentChange > 0 ? '+' : ''}${analyticsData.kpiData.sentimentChange}%`],
      ['Active Clients', analyticsData.kpiData.activeClients.toString(), '-'],
      ['Today Entries', analyticsData.kpiData.todayEntries.toString(), '-'],
    ]

    slide2.addTable([['Metric', 'Value', 'Change'], ...kpiTableData], {
      x: 0.5, y: 1.2, w: 9, h: 3,
      colW: [3, 3, 3],
      fill: { color: 'F5F5F5' },
      border: { pt: 1, color: 'CCCCCC' },
      fontFace: 'Arial',
      fontSize: 12,
    })

    // Media Distribution Slide
    const slide3 = pptx.addSlide()
    slide3.addText('Media Distribution', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, bold: true, color: 'F97316' })

    const mediaTableData = analyticsData.mediaDistributionData.map((m: { name: string; value: number }) => [m.name, `${m.value}%`])
    slide3.addTable([['Media Type', 'Percentage'], ...mediaTableData], {
      x: 0.5, y: 1.2, w: 4, h: 2.5,
      colW: [2, 2],
      fill: { color: 'F5F5F5' },
      border: { pt: 1, color: 'CCCCCC' },
    })

    // Sentiment Slide
    const slide4 = pptx.addSlide()
    slide4.addText('Sentiment Analysis', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, bold: true, color: 'F97316' })

    const sentimentTableData = analyticsData.sentimentData.map((s: { name: string; value: number }) => [s.name, `${s.value}%`])
    slide4.addTable([['Sentiment', 'Percentage'], ...sentimentTableData], {
      x: 0.5, y: 1.2, w: 4, h: 2,
      colW: [2, 2],
      fill: { color: 'F5F5F5' },
      border: { pt: 1, color: 'CCCCCC' },
    })

    // Keywords Slide
    const slide5 = pptx.addSlide()
    slide5.addText('Top Keywords', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, bold: true, color: 'F97316' })

    const keywordsTableData = analyticsData.topKeywordsData.map((k: { keyword: string; count: number; trend: string }) => [k.keyword, k.count.toString(), k.trend])
    slide5.addTable([['Keyword', 'Mentions', 'Trend'], ...keywordsTableData], {
      x: 0.5, y: 1.2, w: 9, h: 3,
      colW: [4, 2.5, 2.5],
      fill: { color: 'F5F5F5' },
      border: { pt: 1, color: 'CCCCCC' },
    })

    // Publications Slide
    const slide6 = pptx.addSlide()
    slide6.addText('Top Publications', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, bold: true, color: 'F97316' })

    const pubsTableData = analyticsData.topPublicationsData.map((p: { name: string; type: string; stories: number; reach: string }) => [p.name, p.type, p.stories.toString(), p.reach])
    slide6.addTable([['Publication', 'Type', 'Stories', 'Reach'], ...pubsTableData], {
      x: 0.5, y: 1.2, w: 9, h: 3,
      colW: [3, 2, 2, 2],
      fill: { color: 'F5F5F5' },
      border: { pt: 1, color: 'CCCCCC' },
    })

    // Generate the PPTX as base64
    const pptxBase64 = await pptx.write({ outputType: 'base64' }) as string

    return NextResponse.json({ 
      data: pptxBase64,
      filename: `Ovaview_Analytics_${clientName.replace(/\s+/g, '_')}_${dateRangeLabel}.pptx`
    })
  } catch (error) {
    console.error('PPTX export error:', error)
    return NextResponse.json({ error: 'Failed to generate PPTX' }, { status: 500 })
  }
}
