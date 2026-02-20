import { NextRequest, NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'

export const dynamic = 'force-dynamic'

// Brand colors (RGB)
const GOLD = [212, 148, 26] as const
const DARK_TEXT = [51, 51, 51] as const
const GRAY_TEXT = [102, 102, 102] as const
const LIGHT_GRAY = [153, 153, 153] as const
const WHITE = [255, 255, 255] as const
const ORANGE = [249, 115, 22] as const
const GREEN = [16, 185, 129] as const
const RED = [239, 68, 68] as const

// Slide dimensions (16:9 aspect ratio in points)
const SLIDE_WIDTH = 960
const SLIDE_HEIGHT = 540

type RGB = readonly [number, number, number]

// Helper to draw a donut chart (ring with value in center)
function drawDonutChart(
  doc: jsPDF,
  value: number,
  total: number,
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  fillColor: RGB,
  bgColor: RGB = [229, 231, 233] // Light gray background
) {
  const percentage = total > 0 ? value / total : 0
  const startAngle = -Math.PI / 2 // Start from top
  const endAngle = startAngle + (percentage * 2 * Math.PI)
  
  // Draw background ring (full circle)
  const segments = 60
  for (let j = 0; j < segments; j++) {
    const a1 = (j / segments) * 2 * Math.PI - Math.PI / 2
    const a2 = ((j + 1) / segments) * 2 * Math.PI - Math.PI / 2
    
    // Outer arc segment
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
    doc.triangle(
      centerX + innerRadius * Math.cos(a1), centerY + innerRadius * Math.sin(a1),
      centerX + outerRadius * Math.cos(a1), centerY + outerRadius * Math.sin(a1),
      centerX + outerRadius * Math.cos(a2), centerY + outerRadius * Math.sin(a2),
      'F'
    )
    doc.triangle(
      centerX + innerRadius * Math.cos(a1), centerY + innerRadius * Math.sin(a1),
      centerX + outerRadius * Math.cos(a2), centerY + outerRadius * Math.sin(a2),
      centerX + innerRadius * Math.cos(a2), centerY + innerRadius * Math.sin(a2),
      'F'
    )
  }
  
  // Draw filled portion
  const filledSegments = Math.round(segments * percentage)
  for (let j = 0; j < filledSegments; j++) {
    const a1 = startAngle + (j / segments) * 2 * Math.PI
    const a2 = startAngle + ((j + 1) / segments) * 2 * Math.PI
    
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2])
    doc.triangle(
      centerX + innerRadius * Math.cos(a1), centerY + innerRadius * Math.sin(a1),
      centerX + outerRadius * Math.cos(a1), centerY + outerRadius * Math.sin(a1),
      centerX + outerRadius * Math.cos(a2), centerY + outerRadius * Math.sin(a2),
      'F'
    )
    doc.triangle(
      centerX + innerRadius * Math.cos(a1), centerY + innerRadius * Math.sin(a1),
      centerX + outerRadius * Math.cos(a2), centerY + outerRadius * Math.sin(a2),
      centerX + innerRadius * Math.cos(a2), centerY + innerRadius * Math.sin(a2),
      'F'
    )
  }
  
  // Draw white center to create donut effect
  doc.setFillColor(255, 255, 255)
  for (let j = 0; j < segments; j++) {
    const a1 = (j / segments) * 2 * Math.PI
    const a2 = ((j + 1) / segments) * 2 * Math.PI
    doc.triangle(
      centerX, centerY,
      centerX + innerRadius * Math.cos(a1), centerY + innerRadius * Math.sin(a1),
      centerX + innerRadius * Math.cos(a2), centerY + innerRadius * Math.sin(a2),
      'F'
    )
  }
}

// Helper to draw a simple bar chart
function drawBarChart(
  doc: jsPDF,
  data: { label: string; value: number }[],
  x: number,
  y: number,
  width: number,
  height: number,
  colors: RGB[]
) {
  if (!data.length) return
  
  const maxValue = Math.max(...data.map(d => d.value), 1)
  const barWidth = (width - 20) / data.length - 10
  const chartHeight = height - 40
  
  data.forEach((item, i) => {
    const barHeight = (item.value / maxValue) * chartHeight
    const barX = x + 10 + i * (barWidth + 10)
    const barY = y + chartHeight - barHeight
    
    // Draw bar
    const color = colors[i % colors.length]
    doc.setFillColor(color[0], color[1], color[2])
    doc.rect(barX, barY, barWidth, barHeight, 'F')
    
    // Draw value on top
    doc.setFontSize(9)
    doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
    doc.text(item.value.toString(), barX + barWidth / 2, barY - 5, { align: 'center' })
    
    // Draw label below
    doc.setFontSize(8)
    doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
    const labelLines = doc.splitTextToSize(item.label, barWidth + 5)
    doc.text(labelLines, barX + barWidth / 2, y + chartHeight + 10, { align: 'center' })
  })
}

// Helper to draw a simple pie chart
function drawPieChart(
  doc: jsPDF,
  data: { label: string; value: number }[],
  centerX: number,
  centerY: number,
  radius: number,
  colors: RGB[]
) {
  if (!data.length) return
  
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return
  
  let startAngle = -Math.PI / 2 // Start from top
  
  data.forEach((item, i) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI
    const endAngle = startAngle + sliceAngle
    const color = colors[i % colors.length]
    
    // Draw pie slice using path
    doc.setFillColor(color[0], color[1], color[2])
    
    // Create arc path
    const segments = 50
    const points: [number, number][] = [[centerX, centerY]]
    
    for (let j = 0; j <= segments; j++) {
      const angle = startAngle + (sliceAngle * j) / segments
      points.push([
        centerX + radius * Math.cos(angle),
        centerY + radius * Math.sin(angle)
      ])
    }
    
    // Draw filled polygon
    if (points.length > 2) {
      doc.setFillColor(color[0], color[1], color[2])
      const path = points.map((p, idx) => (idx === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ') + ' Z'
      // Use lines approach for jsPDF
      doc.triangle(
        centerX, centerY,
        centerX + radius * Math.cos(startAngle), centerY + radius * Math.sin(startAngle),
        centerX + radius * Math.cos(endAngle), centerY + radius * Math.sin(endAngle),
        'F'
      )
      
      // Fill the arc segments
      for (let j = 0; j < segments; j++) {
        const a1 = startAngle + (sliceAngle * j) / segments
        const a2 = startAngle + (sliceAngle * (j + 1)) / segments
        doc.triangle(
          centerX, centerY,
          centerX + radius * Math.cos(a1), centerY + radius * Math.sin(a1),
          centerX + radius * Math.cos(a2), centerY + radius * Math.sin(a2),
          'F'
        )
      }
    }
    
    // Draw percentage label
    const midAngle = startAngle + sliceAngle / 2
    const labelRadius = radius * 0.7
    const labelX = centerX + labelRadius * Math.cos(midAngle)
    const labelY = centerY + labelRadius * Math.sin(midAngle)
    const percentage = Math.round((item.value / total) * 100)
    
    if (percentage > 5) {
      doc.setFontSize(10)
      doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
      doc.text(`${percentage}%`, labelX, labelY, { align: 'center' })
    }
    
    startAngle = endAngle
  })
  
  // Draw legend below
  let legendY = centerY + radius + 20
  data.forEach((item, i) => {
    const color = colors[i % colors.length]
    const legendX = centerX - radius + (i % 2) * (radius + 20)
    const row = Math.floor(i / 2)
    const ly = legendY + row * 15
    
    doc.setFillColor(color[0], color[1], color[2])
    doc.rect(legendX, ly - 5, 10, 10, 'F')
    doc.setFontSize(8)
    doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
    doc.text(item.label, legendX + 15, ly + 2)
  })
}

// Helper: Add slide header
function addSlideHeader(doc: jsPDF, title: string, clientName?: string) {
  // Gold header bar
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
  doc.rect(0, 0, SLIDE_WIDTH, 50, 'F')
  
  // Title
  doc.setFontSize(20)
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
  doc.text(title, 30, 32)
  
  // Client name
  if (clientName) {
    doc.setFontSize(10)
    doc.text(clientName, SLIDE_WIDTH - 30, 32, { align: 'right' })
  }
  
  // Footer
  doc.setFontSize(8)
  doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2])
  doc.text('Ovaview', 20, SLIDE_HEIGHT - 15)
}

// Helper: Add new slide
function addNewSlide(doc: jsPDF) {
  doc.addPage([SLIDE_WIDTH, SLIDE_HEIGHT], 'landscape')
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const {
      clientName, dateRangeLabel,
      scopeOfCoverage, mediaSourcesIndustry, monthlyTrend, thematicAreas,
      topJournalists, totalClientMentions, clientSourcesOfMentions,
      clientMonthlyTrend, orgVisibility, clientMajorStories,
      competitorAnalysis, industrySentiment, clientSentiment,
      keyTakeouts, totalIndustryStories,
    } = data

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [SLIDE_WIDTH, SLIDE_HEIGHT],
    })

    // ===== SLIDE 1: COVER =====
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
    doc.rect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, 'F')
    
    doc.setFontSize(44)
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
    doc.text('MEDIA PRESENCE', SLIDE_WIDTH / 2, 200, { align: 'center' })
    doc.text('ANALYSIS REPORT', SLIDE_WIDTH / 2, 260, { align: 'center' })
    
    doc.setFontSize(18)
    doc.text(dateRangeLabel, SLIDE_WIDTH / 2, 320, { align: 'center' })
    
    if (clientName) {
      doc.setFontSize(12)
      doc.text(clientName, SLIDE_WIDTH - 40, 30, { align: 'right' })
    }

    // ===== SLIDE 2: BRIEF =====
    addNewSlide(doc)
    addSlideHeader(doc, 'Brief')
    
    doc.setFontSize(16)
    doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
    doc.text('This report is an analysis of the PR presence for', SLIDE_WIDTH / 2, 180, { align: 'center' })
    
    doc.setFontSize(24)
    doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
    doc.text(clientName, SLIDE_WIDTH / 2, 230, { align: 'center' })
    
    doc.setFontSize(16)
    doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
    doc.text(`The data was captured from ${dateRangeLabel}.`, SLIDE_WIDTH / 2, 280, { align: 'center' })

    // ===== SLIDE 3: SECTION DIVIDER - Industry =====
    addNewSlide(doc)
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
    doc.rect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, 'F')
    
    doc.setFontSize(36)
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
    doc.text('MEDIA PRESENCE ANALYSIS', SLIDE_WIDTH / 2, 230, { align: 'center' })
    doc.setFontSize(28)
    doc.text('Industry', SLIDE_WIDTH / 2, 280, { align: 'center' })

    // ===== SLIDE 4: SCOPE OF COVERAGE =====
    addNewSlide(doc)
    addSlideHeader(doc, 'Scope of Coverage - Overall', clientName)
    
    const scopeItems = [
      { label: 'News Website', count: scopeOfCoverage?.newsWebsite?.count || 0, desc: scopeOfCoverage?.newsWebsite?.description || 'Monitoring covered major news websites locally and internationally' },
      { label: 'Print Media', count: scopeOfCoverage?.printMedia?.count || 0, desc: scopeOfCoverage?.printMedia?.description || 'Covered all newspapers including major papers' },
      { label: 'Radio', count: scopeOfCoverage?.radio?.count || 0, desc: scopeOfCoverage?.radio?.description || 'Radio stations covered include major FM stations' },
      { label: 'Television', count: scopeOfCoverage?.television?.count || 0, desc: scopeOfCoverage?.television?.description || 'TV stations covered include major channels' },
    ]
    
    // Calculate total for percentage
    const totalScope = scopeItems.reduce((sum, item) => sum + item.count, 0)
    
    // Donut chart colors - alternating gold and dark gray
    const donutColors: RGB[] = [GOLD, GRAY_TEXT, GOLD, GRAY_TEXT]
    
    scopeItems.forEach((item, i) => {
      const centerX = 130 + i * 220
      const centerY = 200
      const outerRadius = 70
      const innerRadius = 50
      
      // Draw donut chart
      drawDonutChart(doc, item.count, totalScope, centerX, centerY, outerRadius, innerRadius, donutColors[i])
      
      // Draw count in center
      doc.setFontSize(36)
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.text(item.count.toString(), centerX, centerY + 12, { align: 'center' })
      
      // Draw label below donut
      doc.setFontSize(14)
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.text(item.label, centerX, centerY + outerRadius + 35, { align: 'center' })
      
      // Draw description text (wrapped)
      doc.setFontSize(10)
      doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
      const descLines = doc.splitTextToSize(item.desc, 180)
      doc.text(descLines.slice(0, 4), centerX, centerY + outerRadius + 60, { align: 'center' })
    })

    // ===== SLIDE 5: MEDIA SOURCES - INDUSTRY =====
    addNewSlide(doc)
    addSlideHeader(doc, 'Media Sources - Industry', clientName)
    
    const mediaPieData = [
      { label: 'News Website', value: mediaSourcesIndustry?.newsWebsite?.count || 0, percentage: mediaSourcesIndustry?.newsWebsite?.percentage || 0 },
      { label: 'Print Media', value: mediaSourcesIndustry?.printMedia?.count || 0, percentage: mediaSourcesIndustry?.printMedia?.percentage || 0 },
      { label: 'Radio', value: mediaSourcesIndustry?.radio?.count || 0, percentage: mediaSourcesIndustry?.radio?.percentage || 0 },
      { label: 'TV', value: mediaSourcesIndustry?.tv?.count || 0, percentage: mediaSourcesIndustry?.tv?.percentage || 0 },
    ]
    
    drawPieChart(doc, mediaPieData, 250, 280, 120, [ORANGE, DARK_TEXT, [192, 132, 252], GRAY_TEXT])
    
    // Sort media sources by count to identify highest and lowest
    const sortedSources = [...mediaPieData].sort((a, b) => b.value - a.value)
    const industryLabel = data.industryName || 'sector'
    
    // Intelligent analysis text
    doc.setFontSize(11)
    doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
    
    // Intro paragraph
    const introText = `The ${industryLabel} continued to receive substantial media publicity during the period under review.`
    const introLines = doc.splitTextToSize(introText, 400)
    doc.text(introLines, 520, 120)
    
    // Total coverage
    const totalText = `Total Coverage – ${(totalIndustryStories || 0).toLocaleString()} news stories from four media sources (print media, news website, radio and television).`
    const totalLines = doc.splitTextToSize(totalText, 400)
    doc.text(totalLines, 520, 180)
    
    // Bullet points from highest to lowest
    let bulletY = 260
    sortedSources.forEach((source, i) => {
      let bulletText = ''
      if (i === 0) {
        bulletText = `•   ${source.label} – highest (${source.percentage}%)`
      } else if (i === sortedSources.length - 1) {
        bulletText = `•   ${source.label} – lowest (${source.percentage}%)`
      } else {
        bulletText = `•   ${source.label} (${source.percentage}%)`
      }
      doc.text(bulletText, 520, bulletY + i * 30)
    })

    // ===== SLIDE 6: MONTHLY TREND =====
    addNewSlide(doc)
    addSlideHeader(doc, 'Media Sources – Monthly Trend (Industry)', clientName)
    
    if (monthlyTrend && monthlyTrend.length > 0) {
      const trendData = monthlyTrend.map((m: any) => ({
        label: m.month,
        value: m.total || (m.print + m.web + m.tv + m.radio)
      }))
      drawBarChart(doc, trendData, 50, 100, 500, 350, [ORANGE])
      
      // Analysis text
      const highestMonth = monthlyTrend.reduce((max: any, m: any) => (m.total || 0) > (max.total || 0) ? m : max, monthlyTrend[0])
      const lowestMonth = monthlyTrend.reduce((min: any, m: any) => (m.total || 0) < (min.total || 0) ? m : min, monthlyTrend[0])
      
      doc.setFontSize(14)
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.text('Period Under Review', 600, 150)
      
      doc.setFontSize(11)
      doc.setTextColor(GREEN[0], GREEN[1], GREEN[2])
      doc.text(`${highestMonth?.month} – ${(highestMonth?.total || 0).toLocaleString()} articles (Highest)`, 600, 200)
      
      doc.setTextColor(RED[0], RED[1], RED[2])
      doc.text(`${lowestMonth?.month} – ${(lowestMonth?.total || 0).toLocaleString()} articles (Lowest)`, 600, 230)
    }

    // ===== SLIDE 7: THEMATIC AREAS =====
    addNewSlide(doc)
    addSlideHeader(doc, 'Thematic Areas of Coverage - Industry', clientName)
    
    if (thematicAreas && thematicAreas.length > 0) {
      const maxWeight = Math.max(...thematicAreas.map((a: any) => a.weight), 1)
      
      // Center the word cloud in the slide (below header, above footer)
      const centerX = SLIDE_WIDTH / 2
      const centerY = 280 // Vertical center of content area
      
      // Generate centered positions in a cloud pattern
      const items = thematicAreas.slice(0, 20)
      const positions: { x: number; y: number }[] = []
      
      // Create a spiral/cloud pattern centered on the slide
      items.forEach((item: any, i: number) => {
        const angle = (i / items.length) * Math.PI * 4 // Spiral
        const radius = 50 + (i * 15) // Expanding radius
        const offsetX = Math.cos(angle + i * 0.5) * (radius * 0.8)
        const offsetY = Math.sin(angle + i * 0.3) * (radius * 0.5)
        positions.push({
          x: centerX + offsetX,
          y: centerY + offsetY - 20
        })
      })
      
      items.forEach((item: any, i: number) => {
        const ratio = item.weight / maxWeight
        const fontSize = Math.round(12 + ratio * 22)
        const pos = positions[i]
        
        if (ratio > 0.6) {
          doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2])
        } else if (ratio > 0.3) {
          doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
        } else {
          doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
        }
        
        doc.setFontSize(fontSize)
        doc.text(item.keyword, pos.x, pos.y, { align: 'center' })
      })
    }

    // ===== SLIDE 8: KEY JOURNALISTS =====
    addNewSlide(doc)
    addSlideHeader(doc, 'Key Journalists – Top 5', clientName)
    
    if (topJournalists && topJournalists.length > 0) {
      const journalistData = topJournalists.slice(0, 5).map((j: any) => ({
        label: `${j.name}\n${j.outlet}`,
        value: j.count
      }))
      drawBarChart(doc, journalistData, 100, 100, 750, 380, [DARK_TEXT])
    }

    // ===== SLIDE 9: SECTION DIVIDER - Client Visibility =====
    addNewSlide(doc)
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
    doc.rect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, 'F')
    
    doc.setFontSize(36)
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
    doc.text('Visibility of', SLIDE_WIDTH / 2, 230, { align: 'center' })
    doc.setFontSize(28)
    doc.text(clientName, SLIDE_WIDTH / 2, 280, { align: 'center' })

    // ===== SLIDE 10: CLIENT VISIBILITY =====
    addNewSlide(doc)
    addSlideHeader(doc, `Client Visibility — ${clientName}`, clientName)
    
    if (orgVisibility && orgVisibility.length > 0) {
      const visData = orgVisibility.map((o: any) => ({ label: o.name, value: o.mentions }))
      drawPieChart(doc, visData, 200, 280, 100, [DARK_TEXT, ORANGE, RED, [59, 130, 246], GRAY_TEXT])
    }
    
    // Sources bar chart
    if (clientSourcesOfMentions) {
      const sourceData = [
        { label: 'Print', value: clientSourcesOfMentions.printMedia || 0 },
        { label: 'Web', value: clientSourcesOfMentions.newsWebsite || 0 },
        { label: 'TV', value: clientSourcesOfMentions.tv || 0 },
        { label: 'Radio', value: clientSourcesOfMentions.radio || 0 },
      ]
      drawBarChart(doc, sourceData, 450, 100, 450, 180, [ORANGE])
    }

    // ===== SLIDE 11: MAJOR STORIES =====
    if (clientMajorStories && clientMajorStories.length > 0) {
      addNewSlide(doc)
      addSlideHeader(doc, `Major Stories – ${clientName}`, clientName)
      
      clientMajorStories.slice(0, 6).forEach((story: any, i: number) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const x = 40 + col * 460
        const y = 80 + row * 150
        
        doc.setFontSize(9)
        doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2])
        doc.text(story.date || '', x, y)
        
        doc.setFontSize(11)
        doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
        const titleLines = doc.splitTextToSize(story.title || '', 420)
        doc.text(titleLines.slice(0, 2), x, y + 18)
        
        doc.setFontSize(9)
        doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
        const summaryLines = doc.splitTextToSize(story.summary?.substring(0, 200) || '', 420)
        doc.text(summaryLines.slice(0, 4), x, y + 50)
      })
    }

    // ===== SLIDE 12: SECTION DIVIDER - Competitors =====
    addNewSlide(doc)
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
    doc.rect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, 'F')
    
    doc.setFontSize(36)
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
    doc.text('Visibility of', SLIDE_WIDTH / 2, 230, { align: 'center' })
    doc.setFontSize(28)
    doc.text('Competitors', SLIDE_WIDTH / 2, 280, { align: 'center' })

    // ===== SLIDE 13: COMPETITOR PRESENCE =====
    addNewSlide(doc)
    addSlideHeader(doc, 'Competitor Presence – Top 5 Sector Players', clientName)
    
    if (competitorAnalysis && competitorAnalysis.length > 0) {
      const compData: { label: string; value: number }[] = competitorAnalysis.slice(0, 5).map((c: any) => ({ label: c.name, value: c.mentions }))
      drawPieChart(doc, compData, 250, 280, 120, [GRAY_TEXT, [59, 130, 246], ORANGE, DARK_TEXT, [192, 132, 252]])
      
      const totalMentions = compData.reduce((sum, c) => sum + c.value, 0)
      doc.setFontSize(12)
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.text(`Total mentions: ${totalMentions.toLocaleString()}`, 550, 200)
      
      compData.forEach((c, i) => {
        doc.text(`• ${c.label}: ${c.value}`, 550, 240 + i * 25)
      })
    }

    // ===== SLIDE 14: SENTIMENTS =====
    addNewSlide(doc)
    addSlideHeader(doc, 'Story Orientation - Sentiments', clientName)
    
    if (industrySentiment) {
      const sentimentData = [
        { label: 'Positive', value: industrySentiment.positive?.count || 0 },
        { label: 'Negative', value: industrySentiment.negative?.count || 0 },
        { label: 'Neutral', value: industrySentiment.neutral?.count || 0 },
      ]
      drawPieChart(doc, sentimentData, 200, 260, 100, [GREEN, RED, [234, 179, 8]])
      
      // Summary
      const total = sentimentData.reduce((sum, s) => sum + s.value, 0)
      doc.setFontSize(11)
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.text(`Out of ${total.toLocaleString()} stories:`, 500, 180)
      doc.text(`• ${industrySentiment.positive?.percentage || 0}% were positive`, 500, 210)
      doc.text(`• ${industrySentiment.negative?.percentage || 0}% were negative`, 500, 240)
      doc.text(`• ${industrySentiment.neutral?.percentage || 0}% were neutral`, 500, 270)
    }

    // ===== SLIDE 15: KEY TAKEOUTS =====
    addNewSlide(doc)
    
    doc.setFontSize(24)
    doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2])
    doc.text('Key Takeouts - Conclusions', 40, 50)
    
    doc.setFontSize(10)
    doc.text('Ovaview', SLIDE_WIDTH - 40, 50, { align: 'right' })
    
    if (keyTakeouts && keyTakeouts.length > 0) {
      keyTakeouts.slice(0, 6).forEach((takeout: string, i: number) => {
        const y = 100 + i * 70
        const color = i % 2 === 1 ? ORANGE : DARK_TEXT
        
        doc.setFontSize(12)
        doc.setTextColor(color[0], color[1], color[2])
        
        const lines = doc.splitTextToSize(`➤  ${takeout}`, 880)
        doc.text(lines.slice(0, 3), 50, y)
      })
    }

    // Generate PDF as base64
    const pdfBase64 = doc.output('datauristring').split(',')[1]

    return NextResponse.json({
      data: pdfBase64,
      filename: `${clientName.replace(/\s+/g, '_')}_PR_Presence_Analysis_${dateRangeLabel.replace(/\s+/g, '_')}.pdf`,
    })
  } catch (error) {
    console.error('PR Presence PDF export error:', error)
    return NextResponse.json({ error: 'Failed to generate PR Presence PDF' }, { status: 500 })
  }
}
