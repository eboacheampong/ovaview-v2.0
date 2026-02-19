import { NextRequest, NextResponse } from 'next/server'
import PptxGenJS from 'pptxgenjs'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { analyticsData, competitorData, clientName, dateRangeLabel, mediaFilter, charts } = await request.json()

    if (!analyticsData) {
      return NextResponse.json({ error: 'No analytics data provided' }, { status: 400 })
    }

    const pptx = new PptxGenJS()
    pptx.author = 'Ovaview'
    pptx.title = 'Media Analytics Report'
    pptx.subject = `Analytics for ${clientName}`
    pptx.company = 'Ovaview Media Monitoring'

    // Slide 1: Title
    const slide1 = pptx.addSlide()
    slide1.addText('Media Analytics Report', { x: 0.5, y: 2, w: 9, h: 1, fontSize: 40, bold: true, color: 'F97316', align: 'center' })
    slide1.addText(clientName, { x: 0.5, y: 3.2, w: 9, h: 0.6, fontSize: 28, color: '666666', align: 'center' })
    slide1.addText(`Period: ${dateRangeLabel} | Media Filter: ${mediaFilter}`, { x: 0.5, y: 4, w: 9, h: 0.4, fontSize: 14, color: '999999', align: 'center' })
    slide1.addText(`Generated: ${new Date().toLocaleDateString()}`, { x: 0.5, y: 4.5, w: 9, h: 0.4, fontSize: 12, color: 'AAAAAA', align: 'center' })

    // Slide 2: KPI Summary
    const slide2 = pptx.addSlide()
    slide2.addText('Key Performance Indicators', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, bold: true, color: 'F97316' })

    const kpiTableData = [
      ['Total Coverage', analyticsData.kpiData.totalCoverage.toLocaleString(), `${analyticsData.kpiData.coverageChange > 0 ? '+' : ''}${analyticsData.kpiData.coverageChange}%`],
      ['Media Reach', analyticsData.kpiData.totalReach, `${analyticsData.kpiData.reachChange > 0 ? '+' : ''}${analyticsData.kpiData.reachChange}%`],
      ['Avg Sentiment', `${analyticsData.kpiData.avgSentiment}%`, `${analyticsData.kpiData.sentimentChange > 0 ? '+' : ''}${analyticsData.kpiData.sentimentChange}%`],
      ['Active Clients', analyticsData.kpiData.activeClients.toString(), '-'],
      ['Today Entries', analyticsData.kpiData.todayEntries.toString(), '-'],
      ['Web Stories', analyticsData.kpiData.webCount?.toString() || '0', '-'],
      ['TV Stories', analyticsData.kpiData.tvCount?.toString() || '0', '-'],
      ['Radio Stories', analyticsData.kpiData.radioCount?.toString() || '0', '-'],
      ['Print Stories', analyticsData.kpiData.printCount?.toString() || '0', '-'],
    ]

    slide2.addTable([['Metric', 'Value', 'Change'], ...kpiTableData], {
      x: 0.5, y: 1, w: 9, h: 4,
      colW: [3, 3, 3],
      fill: { color: 'F8F8F8' },
      border: { pt: 0.5, color: 'DDDDDD' },
      fontFace: 'Arial',
      fontSize: 11,
      valign: 'middle',
    })

    // Slide 3: Coverage Trend with Chart
    const slide3 = pptx.addSlide()
    slide3.addText('Coverage Trend', { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 24, bold: true, color: 'F97316' })
    
    if (charts?.coverageTrend) {
      // Add chart image
      slide3.addImage({ data: charts.coverageTrend, x: 0.3, y: 0.9, w: 9.4, h: 3.2 })
    }
    
    // Add data table below chart
    const trendTableData = analyticsData.coverageTrendData.map((t: { month: string; web: number; print: number; radio: number; tv: number; total: number }) => 
      [t.month, t.web.toString(), t.print.toString(), t.radio.toString(), t.tv.toString(), t.total.toString()]
    )
    slide3.addTable([['Month', 'Web', 'Print', 'Radio', 'TV', 'Total'], ...trendTableData], {
      x: 0.5, y: 4.3, w: 9, h: 1.2,
      colW: [1.5, 1.5, 1.5, 1.5, 1.5, 1.5],
      fill: { color: 'F8F8F8' },
      border: { pt: 0.5, color: 'DDDDDD' },
      fontSize: 9,
    })

    // Slide 4: Sentiment & Media Distribution
    const slide4 = pptx.addSlide()
    slide4.addText('Sentiment & Media Distribution', { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 24, bold: true, color: 'F97316' })
    
    if (charts?.sentiment) {
      slide4.addImage({ data: charts.sentiment, x: 0.3, y: 0.9, w: 4.5, h: 2.5 })
    }
    if (charts?.mediaDistribution) {
      slide4.addImage({ data: charts.mediaDistribution, x: 5.2, y: 0.9, w: 4.5, h: 2.5 })
    }
    
    // Sentiment table
    const sentimentTableData = analyticsData.sentimentData.map((s: { name: string; value: number }) => [s.name, `${s.value}%`])
    slide4.addTable([['Sentiment', '%'], ...sentimentTableData], {
      x: 0.5, y: 3.6, w: 4, h: 1.5,
      colW: [2, 2],
      fill: { color: 'F8F8F8' },
      border: { pt: 0.5, color: 'DDDDDD' },
      fontSize: 10,
    })
    
    // Media distribution table
    const mediaTableData = analyticsData.mediaDistributionData.map((m: { name: string; value: number }) => [m.name, `${m.value}%`])
    slide4.addTable([['Media Type', '%'], ...mediaTableData], {
      x: 5.5, y: 3.6, w: 4, h: 1.5,
      colW: [2, 2],
      fill: { color: 'F8F8F8' },
      border: { pt: 0.5, color: 'DDDDDD' },
      fontSize: 10,
    })

    // Slide 5: Industry Performance Radar
    const slide5 = pptx.addSlide()
    slide5.addText('Industry Performance', { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 24, bold: true, color: 'F97316' })
    
    if (charts?.radar) {
      slide5.addImage({ data: charts.radar, x: 0.5, y: 0.9, w: 5, h: 3 })
    }
    
    // Industry table
    const industryTableData = analyticsData.industryPerformanceData.map((i: { industry: string; coverage: number; sentiment: number; reach: number }) => 
      [i.industry, `${i.coverage}%`, `${i.sentiment}%`, `${i.reach}%`]
    )
    slide5.addTable([['Industry', 'Coverage', 'Sentiment', 'Reach'], ...industryTableData], {
      x: 5.7, y: 0.9, w: 4, h: 3,
      colW: [1.6, 0.8, 0.8, 0.8],
      fill: { color: 'F8F8F8' },
      border: { pt: 0.5, color: 'DDDDDD' },
      fontSize: 9,
    })

    // Slide 6: Hourly Engagement
    const slide6 = pptx.addSlide()
    slide6.addText('Engagement by Hour', { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 24, bold: true, color: 'F97316' })
    
    if (charts?.hourlyEngagement) {
      slide6.addImage({ data: charts.hourlyEngagement, x: 0.3, y: 0.9, w: 9.4, h: 3.5 })
    }

    // Slide 7: Top Keywords
    const slide7 = pptx.addSlide()
    slide7.addText('Top Keywords', { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 24, bold: true, color: 'F97316' })

    const keywordsTableData = analyticsData.topKeywordsData.map((k: { keyword: string; count: number; trend: string }) => 
      [k.keyword, k.count.toString(), k.trend === 'up' ? '↑ Up' : k.trend === 'down' ? '↓ Down' : '→ Stable']
    )
    slide7.addTable([['Keyword', 'Mentions', 'Trend'], ...keywordsTableData], {
      x: 0.5, y: 1, w: 9, h: 3.5,
      colW: [4, 2.5, 2.5],
      fill: { color: 'F8F8F8' },
      border: { pt: 0.5, color: 'DDDDDD' },
      fontSize: 12,
    })

    // Slide 8: Top Publications
    const slide8 = pptx.addSlide()
    slide8.addText('Top Publications', { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 24, bold: true, color: 'F97316' })

    const pubsTableData = analyticsData.topPublicationsData.map((p: { name: string; type: string; stories: number; reach: string }) => 
      [p.name, p.type.charAt(0).toUpperCase() + p.type.slice(1), p.stories.toString(), p.reach]
    )
    slide8.addTable([['Publication', 'Type', 'Stories', 'Reach'], ...pubsTableData], {
      x: 0.5, y: 1, w: 9, h: 3.5,
      colW: [3.5, 1.5, 2, 2],
      fill: { color: 'F8F8F8' },
      border: { pt: 0.5, color: 'DDDDDD' },
      fontSize: 11,
    })

    // Slide 9: Top Clients
    const slide9 = pptx.addSlide()
    slide9.addText('Top Performing Clients', { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 24, bold: true, color: 'F97316' })

    const clientsTableData = analyticsData.topClientsData.map((c: { name: string; mentions: number; sentiment: number; reach: string }) => 
      [c.name, c.mentions.toString(), `${c.sentiment}%`, c.reach]
    )
    slide9.addTable([['Client', 'Mentions', 'Sentiment', 'Reach'], ...clientsTableData], {
      x: 0.5, y: 1, w: 9, h: 3,
      colW: [3.5, 1.5, 2, 2],
      fill: { color: 'F8F8F8' },
      border: { pt: 0.5, color: 'DDDDDD' },
      fontSize: 11,
    })

    // Slide 10: Key Journalists
    const slide10 = pptx.addSlide()
    slide10.addText('Key Journalists', { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 24, bold: true, color: 'F97316' })

    const journalistTableData = analyticsData.journalistData.map((j: { name: string; outlet: string; articles: number; sentiment: number }) => 
      [j.name, j.outlet, j.articles.toString(), `${j.sentiment}%`]
    )
    slide10.addTable([['Journalist', 'Outlet', 'Articles', 'Sentiment'], ...journalistTableData], {
      x: 0.5, y: 1, w: 9, h: 3,
      colW: [3, 3, 1.5, 1.5],
      fill: { color: 'F8F8F8' },
      border: { pt: 0.5, color: 'DDDDDD' },
      fontSize: 11,
    })

    // Slide 11: Share of Voice (if competitor data available)
    if (competitorData?.shareOfVoiceData && competitorData.shareOfVoiceData.length > 0) {
      const slide11 = pptx.addSlide()
      slide11.addText('Share of Voice', { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 24, bold: true, color: 'F97316' })
      
      if (charts?.shareOfVoice) {
        slide11.addImage({ data: charts.shareOfVoice, x: 0.5, y: 0.9, w: 5, h: 3 })
      }
      
      const sovTableData = competitorData.shareOfVoiceData.map((s: { name: string; value: number }) => [s.name, `${s.value}%`])
      slide11.addTable([['Brand', 'Share'], ...sovTableData], {
        x: 5.7, y: 0.9, w: 4, h: 3,
        colW: [2.5, 1.5],
        fill: { color: 'F8F8F8' },
        border: { pt: 0.5, color: 'DDDDDD' },
        fontSize: 11,
      })
    }

    // Final Slide: Thank You
    const finalSlide = pptx.addSlide()
    finalSlide.addText('Thank You', { x: 0.5, y: 2.2, w: 9, h: 1, fontSize: 40, bold: true, color: 'F97316', align: 'center' })
    finalSlide.addText('Ovaview Media Monitoring', { x: 0.5, y: 3.3, w: 9, h: 0.5, fontSize: 18, color: '666666', align: 'center' })
    finalSlide.addText('For questions or support, contact your account manager', { x: 0.5, y: 4, w: 9, h: 0.4, fontSize: 12, color: '999999', align: 'center' })

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
