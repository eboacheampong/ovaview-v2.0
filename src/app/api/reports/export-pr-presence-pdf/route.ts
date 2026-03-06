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
const BLACK_RGB = [31, 41, 55] as const
const PURPLE = [192, 132, 252] as const

// Slide dimensions (16:9 aspect ratio in points)
const SLIDE_WIDTH = 960
const SLIDE_HEIGHT = 540

type RGB = readonly [number, number, number]

// Helper to draw a donut chart (ring with value in center)
function drawDonutChart(
  doc: jsPDF, value: number, total: number,
  centerX: number, centerY: number,
  outerRadius: number, innerRadius: number,
  fillColor: RGB, bgColor: RGB = [229, 231, 233]
) {
  const percentage = total > 0 ? value / total : 0
  const startAngle = -Math.PI / 2
  const segments = 60

  // Background ring
  for (let j = 0; j < segments; j++) {
    const a1 = (j / segments) * 2 * Math.PI - Math.PI / 2
    const a2 = ((j + 1) / segments) * 2 * Math.PI - Math.PI / 2
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
    doc.triangle(centerX + innerRadius * Math.cos(a1), centerY + innerRadius * Math.sin(a1), centerX + outerRadius * Math.cos(a1), centerY + outerRadius * Math.sin(a1), centerX + outerRadius * Math.cos(a2), centerY + outerRadius * Math.sin(a2), 'F')
    doc.triangle(centerX + innerRadius * Math.cos(a1), centerY + innerRadius * Math.sin(a1), centerX + outerRadius * Math.cos(a2), centerY + outerRadius * Math.sin(a2), centerX + innerRadius * Math.cos(a2), centerY + innerRadius * Math.sin(a2), 'F')
  }

  // Filled portion
  const filledSegments = Math.round(segments * percentage)
  for (let j = 0; j < filledSegments; j++) {
    const a1 = startAngle + (j / segments) * 2 * Math.PI
    const a2 = startAngle + ((j + 1) / segments) * 2 * Math.PI
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2])
    doc.triangle(centerX + innerRadius * Math.cos(a1), centerY + innerRadius * Math.sin(a1), centerX + outerRadius * Math.cos(a1), centerY + outerRadius * Math.sin(a1), centerX + outerRadius * Math.cos(a2), centerY + outerRadius * Math.sin(a2), 'F')
    doc.triangle(centerX + innerRadius * Math.cos(a1), centerY + innerRadius * Math.sin(a1), centerX + outerRadius * Math.cos(a2), centerY + outerRadius * Math.sin(a2), centerX + innerRadius * Math.cos(a2), centerY + innerRadius * Math.sin(a2), 'F')
  }

  // White center
  doc.setFillColor(255, 255, 255)
  for (let j = 0; j < segments; j++) {
    const a1 = (j / segments) * 2 * Math.PI
    const a2 = ((j + 1) / segments) * 2 * Math.PI
    doc.triangle(centerX, centerY, centerX + innerRadius * Math.cos(a1), centerY + innerRadius * Math.sin(a1), centerX + innerRadius * Math.cos(a2), centerY + innerRadius * Math.sin(a2), 'F')
  }
}

// Helper to draw a simple bar chart (single color per bar)
function drawBarChart(
  doc: jsPDF, data: { label: string; value: number }[],
  x: number, y: number, width: number, height: number, colors: RGB[]
) {
  if (!data.length) return
  const maxValue = Math.max(...data.map(d => d.value), 1)
  const barWidth = (width - 20) / data.length - 10
  const chartHeight = height - 50

  data.forEach((item, i) => {
    const barHeight = (item.value / maxValue) * chartHeight
    const barX = x + 10 + i * (barWidth + 10)
    const barY = y + chartHeight - barHeight
    const color = colors[i % colors.length]
    doc.setFillColor(color[0], color[1], color[2])
    doc.rect(barX, barY, barWidth, barHeight, 'F')
    doc.setFontSize(12)
    doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
    doc.text(item.value.toString(), barX + barWidth / 2, barY - 8, { align: 'center' })
    doc.setFontSize(10)
    doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
    const labelLines = doc.splitTextToSize(item.label, barWidth + 10)
    doc.text(labelLines, barX + barWidth / 2, y + chartHeight + 15, { align: 'center' })
  })
}

// Helper to draw a CLUSTERED bar chart (multiple series per category)
function drawClusteredBarChart(
  doc: jsPDF,
  categories: string[],
  series: { name: string; values: number[]; color: RGB }[],
  x: number, y: number, width: number, height: number
) {
  if (!categories.length || !series.length) return
  const maxValue = Math.max(...series.flatMap(s => s.values), 1)
  const chartHeight = height - 60
  const groupWidth = (width - 40) / categories.length
  const barWidth = Math.min((groupWidth - 8) / series.length, 40)

  categories.forEach((cat, ci) => {
    const groupX = x + 20 + ci * groupWidth
    series.forEach((s, si) => {
      const val = s.values[ci] || 0
      const barHeight = (val / maxValue) * chartHeight
      const barX = groupX + si * barWidth + (groupWidth - barWidth * series.length) / 2
      const barY = y + chartHeight - barHeight
      doc.setFillColor(s.color[0], s.color[1], s.color[2])
      doc.rect(barX, barY, barWidth - 2, barHeight, 'F')
      // Value label on top
      if (val > 0) {
        doc.setFontSize(7)
        doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
        doc.text(val.toString(), barX + (barWidth - 2) / 2, barY - 4, { align: 'center' })
      }
    })
    // Category label
    doc.setFontSize(9)
    doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
    doc.text(cat, groupX + groupWidth / 2, y + chartHeight + 15, { align: 'center' })
  })

  // Legend
  let legendX = x + 20
  const legendY = y + height - 15
  series.forEach(s => {
    doc.setFillColor(s.color[0], s.color[1], s.color[2])
    doc.rect(legendX, legendY - 6, 10, 10, 'F')
    doc.setFontSize(8)
    doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
    doc.text(s.name, legendX + 14, legendY + 2)
    legendX += doc.getTextWidth(s.name) + 30
  })
}

// Helper to draw a pie chart with segment borders
function drawPieChart(
  doc: jsPDF, data: { label: string; value: number }[],
  centerX: number, centerY: number, radius: number, colors: RGB[]
) {
  if (!data.length) return
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return

  let startAngle = -Math.PI / 2
  const segments = 50

  // Draw filled segments
  data.forEach((item, i) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI
    const color = colors[i % colors.length]
    doc.setFillColor(color[0], color[1], color[2])
    for (let j = 0; j < segments; j++) {
      const a1 = startAngle + (sliceAngle * j) / segments
      const a2 = startAngle + (sliceAngle * (j + 1)) / segments
      doc.triangle(centerX, centerY, centerX + radius * Math.cos(a1), centerY + radius * Math.sin(a1), centerX + radius * Math.cos(a2), centerY + radius * Math.sin(a2), 'F')
    }
    startAngle += sliceAngle
  })

  // White borders between segments
  startAngle = -Math.PI / 2
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(3)
  data.forEach((item) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI
    doc.line(centerX, centerY, centerX + radius * Math.cos(startAngle), centerY + radius * Math.sin(startAngle))
    startAngle += sliceAngle
  })

  // Outer circle border
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(2)
  for (let j = 0; j < 60; j++) {
    const a1 = (j / 60) * 2 * Math.PI
    const a2 = ((j + 1) / 60) * 2 * Math.PI
    doc.line(centerX + radius * Math.cos(a1), centerY + radius * Math.sin(a1), centerX + radius * Math.cos(a2), centerY + radius * Math.sin(a2))
  }

  // Labels inside slices: count + percentage
  startAngle = -Math.PI / 2
  data.forEach((item) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI
    const midAngle = startAngle + sliceAngle / 2
    const labelRadius = radius * 0.65
    const labelX = centerX + labelRadius * Math.cos(midAngle)
    const labelY = centerY + labelRadius * Math.sin(midAngle)
    const percentage = Math.round((item.value / total) * 100)
    if (percentage > 5) {
      doc.setFontSize(11)
      doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
      doc.text(`${item.value}`, labelX, labelY - 2, { align: 'center' })
      doc.setFontSize(9)
      doc.text(`(${percentage}%)`, labelX, labelY + 12, { align: 'center' })
    }
    startAngle += sliceAngle
  })

  // Legend below
  let legendY = centerY + radius + 25
  data.forEach((item, i) => {
    const color = colors[i % colors.length]
    const legendX = centerX - radius + (i % 2) * (radius + 30)
    const row = Math.floor(i / 2)
    const ly = legendY + row * 20
    doc.setFillColor(color[0], color[1], color[2])
    doc.rect(legendX, ly - 6, 12, 12, 'F')
    doc.setFontSize(10)
    doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
    doc.text(item.label, legendX + 18, ly + 3)
  })
}

// Helper: Add slide header with gold bar, title, logo/client name, footer
function addSlideHeader(doc: jsPDF, title: string, clientName?: string, logoBase64?: string | null) {
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
  doc.rect(0, 0, SLIDE_WIDTH, 50, 'F')
  doc.setFontSize(20)
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
  doc.text(title, 30, 32)
  // Logo (contain-fit) or client name top-right
  if (logoBase64) {
    try { doc.addImage(logoBase64, 'AUTO', SLIDE_WIDTH - 120, 5, 90, 40) } catch {}
  } else if (clientName) {
    doc.setFontSize(10)
    doc.text(clientName, SLIDE_WIDTH - 30, 32, { align: 'right' })
  }
  // Footer
  doc.setFontSize(8)
  doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2])
  doc.text('Ovaview', 20, SLIDE_HEIGHT - 15)
}

function addNewSlide(doc: jsPDF) {
  doc.addPage([SLIDE_WIDTH, SLIDE_HEIGHT], 'landscape')
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const {
      clientName, clientLogo, dateRangeLabel,
      scopeOfCoverage, mediaSourcesIndustry, monthlyTrend, thematicAreas,
      topJournalists, totalClientMentions, clientSourcesOfMentions,
      clientMonthlyTrend, orgVisibility, clientMajorStories,
      competitorAnalysis, industrySentiment, clientSentiment,
      keyTakeouts, totalIndustryStories,
    } = data

    // Fetch client logo as base64
    let logoBase64: string | null = null
    if (clientLogo) {
      try {
        const res = await fetch(clientLogo, { signal: AbortSignal.timeout(10000) })
        if (res.ok) {
          const buffer = await res.arrayBuffer()
          const contentType = res.headers.get('content-type') || 'image/png'
          logoBase64 = `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`
        }
      } catch {}
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [SLIDE_WIDTH, SLIDE_HEIGHT] })

    // ===== SLIDE 1: COVER =====
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
    doc.rect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, 'F')

    doc.setFontSize(44)
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
    doc.text('MEDIA PRESENCE', SLIDE_WIDTH / 2, 200, { align: 'center' })
    doc.text('ANALYSIS REPORT', SLIDE_WIDTH / 2, 260, { align: 'center' })

    doc.setFontSize(18)
    doc.text(dateRangeLabel, SLIDE_WIDTH / 2, 320, { align: 'center' })

    // Logo top-right on cover, client name below date if no logo
    if (logoBase64) {
      try { doc.addImage(logoBase64, 'AUTO', SLIDE_WIDTH - 150, 15, 120, 65) } catch {}
    }
    if (clientName && !logoBase64) {
      doc.setFontSize(20)
      doc.text(clientName, SLIDE_WIDTH / 2, 370, { align: 'center' })
    }

    // ===== SLIDE 2: BRIEF =====
    addNewSlide(doc)
    addSlideHeader(doc, 'Brief', clientName, logoBase64)

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
    if (logoBase64) {
      try { doc.addImage(logoBase64, 'AUTO', SLIDE_WIDTH - 140, 15, 110, 55) } catch {}
    }
    doc.setFontSize(36)
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
    doc.text('MEDIA PRESENCE ANALYSIS', SLIDE_WIDTH / 2, 230, { align: 'center' })
    doc.setFontSize(28)
    doc.text('Industry', SLIDE_WIDTH / 2, 280, { align: 'center' })

    // ===== SLIDE 4: SCOPE OF COVERAGE =====
    addNewSlide(doc)
    addSlideHeader(doc, 'Scope of Coverage - Overall', clientName, logoBase64)

    const scopeItems = [
      { label: 'News Website', count: scopeOfCoverage?.newsWebsite?.count || 0, desc: scopeOfCoverage?.newsWebsite?.description || '' },
      { label: 'Print Media', count: scopeOfCoverage?.printMedia?.count || 0, desc: scopeOfCoverage?.printMedia?.description || '' },
      { label: 'Radio', count: scopeOfCoverage?.radio?.count || 0, desc: scopeOfCoverage?.radio?.description || '' },
      { label: 'Television', count: scopeOfCoverage?.television?.count || 0, desc: scopeOfCoverage?.television?.description || '' },
    ]
    const totalScope = scopeItems.reduce((sum, item) => sum + item.count, 0)
    const donutColors: RGB[] = [GOLD, GRAY_TEXT, GOLD, GRAY_TEXT]

    scopeItems.forEach((item, i) => {
      const centerX = 130 + i * 210
      const centerY = 200
      drawDonutChart(doc, item.count, totalScope, centerX, centerY, 65, 45, donutColors[i])
      doc.setFontSize(32)
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.text(item.count.toString(), centerX, centerY + 10, { align: 'center' })
      doc.setFontSize(13)
      doc.text(item.label, centerX, centerY + 90, { align: 'center' })
      doc.setFontSize(9)
      doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
      const descLines = doc.splitTextToSize(item.desc, 170)
      doc.text(descLines.slice(0, 4), centerX, centerY + 115, { align: 'center' })
    })

    // ===== SLIDE 5: MEDIA SOURCES - INDUSTRY (Pie chart) =====
    addNewSlide(doc)
    addSlideHeader(doc, 'Media Sources - Industry', clientName, logoBase64)

    const mediaPieData = [
      { label: 'News Website', value: mediaSourcesIndustry?.newsWebsite?.count || 0, percentage: mediaSourcesIndustry?.newsWebsite?.percentage || 0 },
      { label: 'Print Media', value: mediaSourcesIndustry?.printMedia?.count || 0, percentage: mediaSourcesIndustry?.printMedia?.percentage || 0 },
      { label: 'Radio', value: mediaSourcesIndustry?.radio?.count || 0, percentage: mediaSourcesIndustry?.radio?.percentage || 0 },
      { label: 'TV', value: mediaSourcesIndustry?.tv?.count || 0, percentage: mediaSourcesIndustry?.tv?.percentage || 0 },
    ]

    drawPieChart(doc, mediaPieData, 250, 280, 120, [ORANGE, DARK_TEXT, PURPLE, GRAY_TEXT])

    const sortedSources = [...mediaPieData].sort((a, b) => b.value - a.value)
    const industryLabel = data.industryName || 'sector'

    doc.setFontSize(14)
    doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
    const introText = `The ${industryLabel} continued to receive substantial media publicity during the period under review.`
    const introLines = doc.splitTextToSize(introText, 400)
    doc.text(introLines, 500, 90)

    doc.setFontSize(14)
    const totalText = `Total Coverage – ${(totalIndustryStories || 0).toLocaleString()} news stories from four media sources (print media, news website, radio and television).`
    const totalLines = doc.splitTextToSize(totalText, 400)
    doc.text(totalLines, 500, 160)

    doc.setFontSize(15)
    let bulletY = 260
    sortedSources.forEach((source, i) => {
      let bulletText = ''
      if (i === 0) bulletText = `•   ${source.label} – highest: ${source.value} (${source.percentage}%)`
      else if (i === sortedSources.length - 1) bulletText = `•   ${source.label} – lowest: ${source.value} (${source.percentage}%)`
      else bulletText = `•   ${source.label}: ${source.value} (${source.percentage}%)`
      doc.text(bulletText, 500, bulletY + i * 38)
    })

    // ===== SLIDE 6: MONTHLY TREND (Clustered bar chart per media type) =====
    addNewSlide(doc)
    addSlideHeader(doc, 'Media Sources – Monthly Trend (Industry)', clientName, logoBase64)

    if (monthlyTrend && monthlyTrend.length > 0) {
      const categories = monthlyTrend.map((m: any) => m.month)
      const series = [
        { name: 'Print Media', values: monthlyTrend.map((m: any) => m.print), color: BLACK_RGB as RGB },
        { name: 'News Website', values: monthlyTrend.map((m: any) => m.web), color: ORANGE as RGB },
        { name: 'TV', values: monthlyTrend.map((m: any) => m.tv), color: PURPLE as RGB },
        { name: 'Radio', values: monthlyTrend.map((m: any) => m.radio), color: GRAY_TEXT as RGB },
      ]
      drawClusteredBarChart(doc, categories, series, 30, 80, 540, 400)

      // Analysis text on the right
      const highestMonth = monthlyTrend.reduce((max: any, m: any) => (m.total || 0) > (max.total || 0) ? m : max, monthlyTrend[0])
      const lowestMonth = monthlyTrend.reduce((min: any, m: any) => (m.total || 0) < (min.total || 0) ? m : min, monthlyTrend[0])

      doc.setFontSize(18)
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.text('Period Under Review', 620, 140)

      doc.setFontSize(14)
      doc.setTextColor(GREEN[0], GREEN[1], GREEN[2])
      doc.text(`${highestMonth?.month} – ${(highestMonth?.total || 0).toLocaleString()} articles`, 620, 200)
      doc.setFontSize(11)
      doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
      doc.text('(Highest)', 620, 220)

      doc.setFontSize(14)
      doc.setTextColor(RED[0], RED[1], RED[2])
      doc.text(`${lowestMonth?.month} – ${(lowestMonth?.total || 0).toLocaleString()} articles`, 620, 270)
      doc.setFontSize(11)
      doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
      doc.text('(Lowest)', 620, 290)
    }

    // ===== SLIDE 7: THEMATIC AREAS (Tag cloud as grid) =====
    addNewSlide(doc)
    addSlideHeader(doc, 'Thematic Areas of Coverage - Industry', clientName, logoBase64)

    if (thematicAreas && thematicAreas.length > 0) {
      const maxWeight = Math.max(...thematicAreas.map((a: any) => a.weight), 1)
      const tags = thematicAreas.slice(0, 20)

      // Grid layout: render tags in rows with padding, wrapping to next row
      const gridLeft = 60
      const gridTop = 80
      const gridMaxWidth = SLIDE_WIDTH - 120
      const tagPadX = 20 // horizontal padding inside tag
      const tagPadY = 8  // vertical padding inside tag
      const tagGap = 12  // gap between tags
      const rowGap = 14  // gap between rows

      let curX = gridLeft
      let curY = gridTop

      tags.forEach((item: any) => {
        const ratio = item.weight / maxWeight
        const fontSize = Math.max(12, Math.min(28, Math.round(12 + ratio * 16)))
        doc.setFontSize(fontSize)
        const textWidth = doc.getTextWidth(item.keyword)
        const boxW = textWidth + tagPadX * 2
        const boxH = fontSize + tagPadY * 2

        // Wrap to next row if needed
        if (curX + boxW > gridLeft + gridMaxWidth) {
          curX = gridLeft
          curY += boxH + rowGap
        }

        // Background pill
        if (ratio > 0.6) {
          doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
          doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
        } else if (ratio > 0.3) {
          doc.setFillColor(240, 240, 240)
          doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
        } else {
          doc.setFillColor(245, 245, 245)
          doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
        }

        // Rounded rect (pill shape)
        doc.roundedRect(curX, curY, boxW, boxH, 4, 4, 'F')

        // Tag text centered in pill
        doc.setFontSize(fontSize)
        doc.text(item.keyword, curX + boxW / 2, curY + boxH / 2 + fontSize * 0.3, { align: 'center' })

        curX += boxW + tagGap
      })
    }

    // ===== SLIDE 8: KEY JOURNALISTS =====
    addNewSlide(doc)
    addSlideHeader(doc, 'Key Journalists – Top 5', clientName, logoBase64)

    if (topJournalists && topJournalists.length > 0) {
      const top5 = topJournalists.slice(0, 5)
      const maxCount = Math.max(...top5.map((j: any) => j.count), 1)
      const barWidth = 110
      const maxBarHeight = 260
      const startX = 130
      const barGap = 155
      const baseY = 400

      top5.forEach((j: any, i: number) => {
        const barX = startX + i * barGap
        const barHeight = (j.count / maxCount) * maxBarHeight
        const barY = baseY - barHeight
        doc.setFontSize(14)
        doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
        doc.text(j.count.toString(), barX + barWidth / 2, barY - 12, { align: 'center' })
        doc.setFillColor(BLACK_RGB[0], BLACK_RGB[1], BLACK_RGB[2])
        doc.rect(barX, barY, barWidth, barHeight, 'F')
        doc.setFontSize(10)
        doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
        const nameLines = doc.splitTextToSize(`${j.name},`, barWidth + 20)
        doc.text(nameLines, barX + barWidth / 2, baseY + 18, { align: 'center' })
        doc.setFontSize(9)
        doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
        const outletLines = doc.splitTextToSize(j.outlet, barWidth + 20)
        doc.text(outletLines, barX + barWidth / 2, baseY + 40, { align: 'center' })
      })
    }

    // ===== SLIDE 9: SECTION DIVIDER - Client Visibility =====
    addNewSlide(doc)
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
    doc.rect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, 'F')
    if (logoBase64) {
      try { doc.addImage(logoBase64, 'AUTO', SLIDE_WIDTH - 140, 15, 110, 55) } catch {}
    }
    doc.setFontSize(36)
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
    doc.text('Visibility of', SLIDE_WIDTH / 2, 230, { align: 'center' })
    doc.setFontSize(28)
    doc.text(clientName, SLIDE_WIDTH / 2, 280, { align: 'center' })

    // ===== SLIDE 10: CLIENT VISIBILITY =====
    addNewSlide(doc)
    addSlideHeader(doc, `Client Visibility — ${clientName}`, clientName, logoBase64)

    if (orgVisibility && orgVisibility.length > 0) {
      const visData = orgVisibility.map((o: any) => ({ label: o.name, value: o.mentions }))
      drawPieChart(doc, visData, 200, 280, 100, [DARK_TEXT, ORANGE, RED, [59, 130, 246], GRAY_TEXT])
    }

    // Sources bar chart (right side)
    if (clientSourcesOfMentions) {
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.text(`Sources of Mentions - ${clientName}`, 500, 80)
      doc.setFont('helvetica', 'normal')
      const sourceData = [
        { label: 'Print', value: clientSourcesOfMentions.printMedia || 0 },
        { label: 'Web', value: clientSourcesOfMentions.newsWebsite || 0 },
        { label: 'TV', value: clientSourcesOfMentions.tv || 0 },
        { label: 'Radio', value: clientSourcesOfMentions.radio || 0 },
      ]
      drawBarChart(doc, sourceData, 450, 100, 450, 180, [ORANGE])
    }

    // Client monthly trend (bottom-right)
    if (clientMonthlyTrend && clientMonthlyTrend.length > 0) {
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.text(`Trend of Mentions - ${clientName}`, 500, 310)
      doc.setFont('helvetica', 'normal')
      const trendData = clientMonthlyTrend.map((m: any) => ({ label: m.month, value: m.count }))
      drawBarChart(doc, trendData, 450, 330, 450, 160, [RED])
    }

    // ===== SLIDE 11: MAJOR STORIES =====
    if (clientMajorStories && clientMajorStories.length > 0) {
      addNewSlide(doc)
      addSlideHeader(doc, `Major Stories – ${clientName}`, clientName, logoBase64)

      clientMajorStories.slice(0, 6).forEach((story: any, i: number) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const cardX = 30 + col * 470
        const cardY = 80 + row * 155
        const cardW = 440
        const cardH = 140

        // Card background with warm tint
        doc.setFillColor(255, 248, 240)
        doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'F')

        // Card border
        doc.setDrawColor(253, 232, 208)
        doc.setLineWidth(0.5)
        doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'S')

        // Orange accent bar on left
        doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2])
        doc.rect(cardX, cardY, 3, cardH, 'F')

        const textX = cardX + 14
        const textW = cardW - 24

        // Date
        doc.setFontSize(9)
        doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2])
        doc.setFont('helvetica', 'bold')
        doc.text(story.date || '', textX, cardY + 16)

        // Title
        doc.setFontSize(12)
        doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
        doc.setFont('helvetica', 'bold')
        const titleLines = doc.splitTextToSize(story.title || '', textW)
        doc.text(titleLines.slice(0, 2), textX, cardY + 34)

        // Summary
        doc.setFontSize(9)
        doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
        doc.setFont('helvetica', 'normal')
        const summaryLines = doc.splitTextToSize(story.summary?.substring(0, 180) || '', textW)
        doc.text(summaryLines.slice(0, 4), textX, cardY + 68)
      })
    }

    // ===== SLIDE 12: SECTION DIVIDER - Competitors =====
    addNewSlide(doc)
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
    doc.rect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, 'F')
    if (logoBase64) {
      try { doc.addImage(logoBase64, 'AUTO', SLIDE_WIDTH - 140, 15, 110, 55) } catch {}
    }
    doc.setFontSize(36)
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
    doc.text('Visibility of', SLIDE_WIDTH / 2, 230, { align: 'center' })
    doc.setFontSize(28)
    doc.text('Competitors', SLIDE_WIDTH / 2, 280, { align: 'center' })

    // ===== SLIDE 13: COMPETITOR PRESENCE =====
    addNewSlide(doc)
    addSlideHeader(doc, 'Competitor Presence – Top 5 Sector Players', clientName, logoBase64)

    if (competitorAnalysis && competitorAnalysis.length > 0) {
      const compData: { label: string; value: number }[] = competitorAnalysis.slice(0, 5).map((c: any) => ({ label: c.name, value: c.mentions }))
      drawPieChart(doc, compData, 250, 280, 120, [GRAY_TEXT, [59, 130, 246], ORANGE, DARK_TEXT, PURPLE])

      const totalMentions = compData.reduce((sum, c) => sum + c.value, 0)
      doc.setFontSize(13)
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      const compSummary = `Overall, the presence of companies in the media remained competitive. A total of ${totalMentions.toLocaleString()} mentions.`
      const compLines = doc.splitTextToSize(compSummary, 380)
      doc.text(compLines, 520, 160)

      doc.setFontSize(12)
      compData.forEach((c, i) => {
        doc.text(`• ${c.label}: ${c.value}`, 520, 240 + i * 28)
      })
    }

    // ===== SLIDES: MAJOR STORIES PER COMPETITOR =====
    if (competitorAnalysis && competitorAnalysis.length > 0) {
      competitorAnalysis.slice(0, 5).forEach((competitor: any) => {
        if (competitor.majorStories && competitor.majorStories.length > 0) {
          addNewSlide(doc)
          addSlideHeader(doc, `Major Stories – ${competitor.name}`, clientName, logoBase64)

          competitor.majorStories.slice(0, 6).forEach((story: any, i: number) => {
            const col = i % 2
            const row = Math.floor(i / 2)
            const cardX = 30 + col * 470
            const cardY = 80 + row * 155
            const cardW = 440
            const cardH = 140

            // Card background with warm tint
            doc.setFillColor(255, 248, 240)
            doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'F')

            // Card border
            doc.setDrawColor(253, 232, 208)
            doc.setLineWidth(0.5)
            doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'S')

            // Orange accent bar on left
            doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2])
            doc.rect(cardX, cardY, 3, cardH, 'F')

            const textX = cardX + 14
            const textW = cardW - 24

            // Date
            doc.setFontSize(9)
            doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2])
            doc.setFont('helvetica', 'bold')
            doc.text(story.date || '', textX, cardY + 16)

            // Title
            doc.setFontSize(12)
            doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
            doc.setFont('helvetica', 'bold')
            const titleLines = doc.splitTextToSize(story.title || '', textW)
            doc.text(titleLines.slice(0, 2), textX, cardY + 34)

            // Summary
            doc.setFontSize(9)
            doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
            doc.setFont('helvetica', 'normal')
            const summaryLines = doc.splitTextToSize(story.summary?.substring(0, 180) || '', textW)
            doc.text(summaryLines.slice(0, 4), textX, cardY + 68)
          })
        }
      })
    }

    // ===== SLIDE: SENTIMENTS =====
    addNewSlide(doc)
    addSlideHeader(doc, 'Story Orientation - Sentiments', clientName, logoBase64)

    if (industrySentiment) {
      const sentimentData = [
        { label: 'Positive', value: industrySentiment.positive?.count || 0 },
        { label: 'Negative', value: industrySentiment.negative?.count || 0 },
        { label: 'Neutral', value: industrySentiment.neutral?.count || 0 },
      ]
      drawPieChart(doc, sentimentData, 200, 260, 100, [GREEN, RED, [234, 179, 8]])

      // Client sentiment bars
      if (clientSentiment) {
        doc.setFontSize(12)
        doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
        doc.text(`${clientName} Sentiment`, 520, 100)
        const clientSentData = [
          { label: 'Positive', value: clientSentiment.positive || 0 },
          { label: 'Negative', value: clientSentiment.negative || 0 },
          { label: 'Neutral', value: clientSentiment.neutral || 0 },
        ]
        drawBarChart(doc, clientSentData, 450, 120, 440, 200, [GREEN, RED, [234, 179, 8]])
      }

      // Summary
      const total = sentimentData.reduce((sum, s) => sum + s.value, 0)
      doc.setFontSize(11)
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.text(`Out of ${total.toLocaleString()} stories:`, 450, 370)
      doc.text(`• ${industrySentiment.positive?.percentage || 0}% were positive`, 450, 395)
      doc.text(`• ${industrySentiment.negative?.percentage || 0}% were negative`, 450, 420)
      doc.text(`• ${industrySentiment.neutral?.percentage || 0}% were neutral`, 450, 445)
    }

    // ===== SLIDE: KEY TAKEOUTS =====
    addNewSlide(doc)

    doc.setFontSize(22)
    doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2])
    doc.text('Key Takeouts - Conclusions', 40, 45)

    doc.setFontSize(10)
    doc.text('Ovaview', SLIDE_WIDTH - 40, 45, { align: 'right' })

    if (keyTakeouts && keyTakeouts.length > 0) {
      keyTakeouts.slice(0, 8).forEach((takeout: string, i: number) => {
        const y = 85 + i * 55
        const color = i % 2 === 1 ? ORANGE : DARK_TEXT
        doc.setFontSize(12)
        doc.setTextColor(color[0], color[1], color[2])
        const lines = doc.splitTextToSize(`>  ${takeout}`, 860)
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
