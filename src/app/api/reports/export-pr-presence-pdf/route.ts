import { NextRequest, NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'

export const dynamic = 'force-dynamic'

// Brand colors (RGB)
const GOLD = [212, 148, 26] as const
const DARK_TEXT = [51, 51, 51] as const
const GRAY_TEXT = [102, 102, 102] as const
const WHITE = [255, 255, 255] as const
const ORANGE = [249, 115, 22] as const
const GREEN = [16, 185, 129] as const
const RED = [239, 68, 68] as const
const BLACK_RGB = [31, 41, 55] as const
const PURPLE = [192, 132, 252] as const

// Slide dimensions (16:9 aspect ratio in points)
const SLIDE_WIDTH = 960
const SLIDE_HEIGHT = 540

// Safe content area (above footer)
const FOOTER_HEIGHT = 50
const CONTENT_BOTTOM = SLIDE_HEIGHT - FOOTER_HEIGHT

type RGB = readonly [number, number, number]

// ─── Strip markdown formatting from text ───
function stripMarkdown(text: string): string {
  if (!text) return ''
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')  // bold+italic
    .replace(/\*\*(.*?)\*\*/g, '$1')       // bold
    .replace(/\*(.*?)\*/g, '$1')           // italic
    .replace(/__(.*?)__/g, '$1')           // bold alt
    .replace(/_(.*?)_/g, '$1')             // italic alt
    .replace(/~~(.*?)~~/g, '$1')           // strikethrough
    .replace(/`(.*?)`/g, '$1')             // inline code
    .replace(/^#{1,6}\s+/gm, '')           // headings
    .replace(/^[-*+]\s+/gm, '• ')          // list items to bullets
    .replace(/^\d+\.\s+/gm, '• ')          // numbered lists to bullets
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/\n{3,}/g, '\n\n')            // excessive newlines
    .trim()
}

// ─── Draw donut chart ───
function drawDonutChart(
  doc: jsPDF, value: number, total: number,
  centerX: number, centerY: number,
  outerRadius: number, innerRadius: number,
  fillColor: RGB, bgColor: RGB = [229, 231, 233]
) {
  const percentage = total > 0 ? value / total : 0
  const startAngle = -Math.PI / 2
  const segments = 60

  for (let j = 0; j < segments; j++) {
    const a1 = (j / segments) * 2 * Math.PI - Math.PI / 2
    const a2 = ((j + 1) / segments) * 2 * Math.PI - Math.PI / 2
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
    doc.triangle(centerX + innerRadius * Math.cos(a1), centerY + innerRadius * Math.sin(a1), centerX + outerRadius * Math.cos(a1), centerY + outerRadius * Math.sin(a1), centerX + outerRadius * Math.cos(a2), centerY + outerRadius * Math.sin(a2), 'F')
    doc.triangle(centerX + innerRadius * Math.cos(a1), centerY + innerRadius * Math.sin(a1), centerX + outerRadius * Math.cos(a2), centerY + outerRadius * Math.sin(a2), centerX + innerRadius * Math.cos(a2), centerY + innerRadius * Math.sin(a2), 'F')
  }

  const filledSegments = Math.round(segments * percentage)
  for (let j = 0; j < filledSegments; j++) {
    const a1 = startAngle + (j / segments) * 2 * Math.PI
    const a2 = startAngle + ((j + 1) / segments) * 2 * Math.PI
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2])
    doc.triangle(centerX + innerRadius * Math.cos(a1), centerY + innerRadius * Math.sin(a1), centerX + outerRadius * Math.cos(a1), centerY + outerRadius * Math.sin(a1), centerX + outerRadius * Math.cos(a2), centerY + outerRadius * Math.sin(a2), 'F')
    doc.triangle(centerX + innerRadius * Math.cos(a1), centerY + innerRadius * Math.sin(a1), centerX + outerRadius * Math.cos(a2), centerY + outerRadius * Math.sin(a2), centerX + innerRadius * Math.cos(a2), centerY + innerRadius * Math.sin(a2), 'F')
  }

  doc.setFillColor(255, 255, 255)
  for (let j = 0; j < segments; j++) {
    const a1 = (j / segments) * 2 * Math.PI
    const a2 = ((j + 1) / segments) * 2 * Math.PI
    doc.triangle(centerX, centerY, centerX + innerRadius * Math.cos(a1), centerY + innerRadius * Math.sin(a1), centerX + innerRadius * Math.cos(a2), centerY + innerRadius * Math.sin(a2), 'F')
  }
}

// ─── Draw bar chart ───
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
    doc.setFontSize(13)
    doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
    doc.setFont('helvetica', 'bold')
    doc.text(item.value.toString(), barX + barWidth / 2, barY - 8, { align: 'center' })
    doc.setFontSize(11)
    doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
    doc.setFont('helvetica', 'normal')
    const labelLines = doc.splitTextToSize(item.label, barWidth + 10)
    doc.text(labelLines, barX + barWidth / 2, y + chartHeight + 15, { align: 'center' })
  })
}

// ─── Draw clustered bar chart ───
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
      if (val > 0) {
        doc.setFontSize(8)
        doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
        doc.text(val.toString(), barX + (barWidth - 2) / 2, barY - 4, { align: 'center' })
      }
    })
    doc.setFontSize(10)
    doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
    doc.text(cat, groupX + groupWidth / 2, y + chartHeight + 15, { align: 'center' })
  })

  let legendX = x + 20
  const legendY = y + height - 15
  series.forEach(s => {
    doc.setFillColor(s.color[0], s.color[1], s.color[2])
    doc.rect(legendX, legendY - 6, 10, 10, 'F')
    doc.setFontSize(9)
    doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
    doc.text(s.name, legendX + 14, legendY + 2)
    legendX += doc.getTextWidth(s.name) + 30
  })
}

// ─── Draw pie chart ───
function drawPieChart(
  doc: jsPDF, data: { label: string; value: number }[],
  centerX: number, centerY: number, radius: number, colors: RGB[]
) {
  if (!data.length) return
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return

  let startAngle = -Math.PI / 2
  const segments = 50

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

  startAngle = -Math.PI / 2
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(3)
  data.forEach((item) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI
    doc.line(centerX, centerY, centerX + radius * Math.cos(startAngle), centerY + radius * Math.sin(startAngle))
    startAngle += sliceAngle
  })

  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(2)
  for (let j = 0; j < 60; j++) {
    const a1 = (j / 60) * 2 * Math.PI
    const a2 = ((j + 1) / 60) * 2 * Math.PI
    doc.line(centerX + radius * Math.cos(a1), centerY + radius * Math.sin(a1), centerX + radius * Math.cos(a2), centerY + radius * Math.sin(a2))
  }

  startAngle = -Math.PI / 2
  data.forEach((item) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI
    const midAngle = startAngle + sliceAngle / 2
    const labelRadius = radius * 0.65
    const labelX = centerX + labelRadius * Math.cos(midAngle)
    const labelY = centerY + labelRadius * Math.sin(midAngle)
    const percentage = Math.round((item.value / total) * 100)
    if (percentage > 5) {
      doc.setFontSize(12)
      doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
      doc.text(`${item.value}`, labelX, labelY - 2, { align: 'center' })
      doc.setFontSize(10)
      doc.text(`(${percentage}%)`, labelX, labelY + 12, { align: 'center' })
    }
    startAngle += sliceAngle
  })

  let legendY = centerY + radius + 25
  data.forEach((item, i) => {
    const color = colors[i % colors.length]
    const legendX = centerX - radius + (i % 2) * (radius + 30)
    const row = Math.floor(i / 2)
    const ly = legendY + row * 20
    doc.setFillColor(color[0], color[1], color[2])
    doc.rect(legendX, ly - 6, 12, 12, 'F')
    doc.setFontSize(11)
    doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
    doc.text(item.label, legendX + 18, ly + 3)
  })
}

// ─── Slide header with gold bar + title ───
function addSlideHeader(doc: jsPDF, title: string) {
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
  doc.rect(0, 0, SLIDE_WIDTH, 50, 'F')
  doc.setFontSize(20)
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
  doc.setFont('helvetica', 'bold')
  doc.text(title, 30, 34)
  doc.setFont('helvetica', 'normal')
}

// ─── Footer with logo at bottom-center and page number ───
function addSlideFooter(doc: jsPDF, logoBase64: string | null, pageNum: number) {
  // Separator line
  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.5)
  doc.line(30, CONTENT_BOTTOM + 5, SLIDE_WIDTH - 30, CONTENT_BOTTOM + 5)

  // Logo centered at bottom
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'AUTO', SLIDE_WIDTH / 2 - 45, CONTENT_BOTTOM + 10, 90, 32)
    } catch {
      // Fallback: text logo
      doc.setFontSize(10)
      doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2])
      doc.setFont('helvetica', 'bold')
      doc.text('Ovaview', SLIDE_WIDTH / 2, CONTENT_BOTTOM + 30, { align: 'center' })
      doc.setFont('helvetica', 'normal')
    }
  } else {
    doc.setFontSize(10)
    doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2])
    doc.setFont('helvetica', 'bold')
    doc.text('Ovaview', SLIDE_WIDTH / 2, CONTENT_BOTTOM + 30, { align: 'center' })
    doc.setFont('helvetica', 'normal')
  }

  // Page number bottom-right
  doc.setFontSize(9)
  doc.setTextColor(153, 153, 153)
  doc.setFont('helvetica', 'normal')
  doc.text(`${pageNum}`, SLIDE_WIDTH - 30, CONTENT_BOTTOM + 30, { align: 'right' })
}

function addNewSlide(doc: jsPDF) {
  doc.addPage([SLIDE_WIDTH, SLIDE_HEIGHT], 'landscape')
}

// ─── Render bulleted text with proper formatting, respecting maxY ───
function renderBulletedText(
  doc: jsPDF, text: string,
  x: number, startY: number, maxWidth: number, maxY: number,
  fontSize: number = 13, color: RGB = DARK_TEXT, lineHeight: number = 1.6
) {
  const cleaned = stripMarkdown(text)
  const lines = cleaned.split('\n')
  let curY = startY
  const spacing = fontSize * lineHeight

  for (const line of lines) {
    if (curY + spacing > maxY) break
    const trimmed = line.trim()
    if (!trimmed) { curY += spacing * 0.5; continue }

    const isBullet = trimmed.startsWith('• ') || trimmed.startsWith('- ')
    const content = isBullet ? trimmed.replace(/^[•\-]\s+/, '') : trimmed
    const indent = isBullet ? 20 : 0

    doc.setFontSize(fontSize)
    doc.setTextColor(color[0], color[1], color[2])
    doc.setFont('helvetica', 'normal')

    const wrapped = doc.splitTextToSize(content, maxWidth - indent)
    for (let i = 0; i < wrapped.length; i++) {
      if (curY + spacing > maxY) break
      if (i === 0 && isBullet) {
        doc.text('•', x, curY)
      }
      doc.text(wrapped[i], x + indent, curY)
      curY += spacing
    }
  }
  return curY
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
    let pageNum = 1


    // ===== SLIDE 1: COVER (standalone, no second page bleeding) =====
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
    doc.rect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, 'F')

    doc.setFontSize(48)
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
    doc.setFont('helvetica', 'bold')
    doc.text('MEDIA PRESENCE', SLIDE_WIDTH / 2, 190, { align: 'center' })
    doc.text('ANALYSIS REPORT', SLIDE_WIDTH / 2, 250, { align: 'center' })

    doc.setFontSize(20)
    doc.setFont('helvetica', 'normal')
    doc.text(dateRangeLabel, SLIDE_WIDTH / 2, 310, { align: 'center' })

    // Client name on cover
    doc.setFontSize(18)
    doc.text(clientName || '', SLIDE_WIDTH / 2, 360, { align: 'center' })

    // Logo at bottom-center of cover
    if (logoBase64) {
      try { doc.addImage(logoBase64, 'AUTO', SLIDE_WIDTH / 2 - 55, SLIDE_HEIGHT - 80, 110, 50) } catch {}
    }

    // ===== SLIDE 2: BRIEF =====
    addNewSlide(doc)
    pageNum++
    addSlideHeader(doc, 'Brief')

    doc.setFontSize(18)
    doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
    doc.text('This report is an analysis of the PR presence for', SLIDE_WIDTH / 2, 180, { align: 'center' })

    doc.setFontSize(28)
    doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
    doc.setFont('helvetica', 'bold')
    doc.text(clientName, SLIDE_WIDTH / 2, 240, { align: 'center' })
    doc.setFont('helvetica', 'normal')

    doc.setFontSize(18)
    doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
    doc.text(`The data was captured from ${dateRangeLabel}.`, SLIDE_WIDTH / 2, 300, { align: 'center' })

    addSlideFooter(doc, logoBase64, pageNum)

    // ===== SLIDE 3: SECTION DIVIDER - Industry =====
    addNewSlide(doc)
    pageNum++
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
    doc.rect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, 'F')
    doc.setFontSize(38)
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
    doc.setFont('helvetica', 'bold')
    doc.text('MEDIA PRESENCE ANALYSIS', SLIDE_WIDTH / 2, 230, { align: 'center' })
    doc.setFontSize(30)
    doc.setFont('helvetica', 'normal')
    doc.text('Industry', SLIDE_WIDTH / 2, 280, { align: 'center' })
    if (logoBase64) {
      try { doc.addImage(logoBase64, 'AUTO', SLIDE_WIDTH / 2 - 45, SLIDE_HEIGHT - 70, 90, 35) } catch {}
    }

    // ===== SLIDE 4: SCOPE OF COVERAGE =====
    addNewSlide(doc)
    pageNum++
    addSlideHeader(doc, 'Scope of Coverage - Overall')

    const scopeItems = [
      { label: 'News Website', count: scopeOfCoverage?.newsWebsite?.count || 0, desc: scopeOfCoverage?.newsWebsite?.description || '' },
      { label: 'Print Media', count: scopeOfCoverage?.printMedia?.count || 0, desc: scopeOfCoverage?.printMedia?.description || '' },
      { label: 'Radio', count: scopeOfCoverage?.radio?.count || 0, desc: scopeOfCoverage?.radio?.description || '' },
      { label: 'Television', count: scopeOfCoverage?.television?.count || 0, desc: scopeOfCoverage?.television?.description || '' },
    ]
    const totalScope = scopeItems.reduce((sum, item) => sum + item.count, 0)
    const donutColors: RGB[] = [GOLD, GRAY_TEXT, GOLD, GRAY_TEXT]

    scopeItems.forEach((item, i) => {
      const centerX = 130 + i * 200
      const centerY = 195
      drawDonutChart(doc, item.count, totalScope, centerX, centerY, 60, 42, donutColors[i])
      doc.setFontSize(30)
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.setFont('helvetica', 'bold')
      doc.text(item.count.toString(), centerX, centerY + 10, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(14)
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.text(item.label, centerX, centerY + 85, { align: 'center' })
      doc.setFontSize(11)
      doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
      const descLines = doc.splitTextToSize(stripMarkdown(item.desc), 170)
      doc.text(descLines.slice(0, 3), centerX, centerY + 105, { align: 'center', lineHeightFactor: 1.4 })
    })

    addSlideFooter(doc, logoBase64, pageNum)

    // ===== SLIDE 5: MEDIA SOURCES - INDUSTRY =====
    addNewSlide(doc)
    pageNum++
    addSlideHeader(doc, 'Media Sources - Industry')

    const mediaPieData = [
      { label: 'News Website', value: mediaSourcesIndustry?.newsWebsite?.count || 0, percentage: mediaSourcesIndustry?.newsWebsite?.percentage || 0 },
      { label: 'Print Media', value: mediaSourcesIndustry?.printMedia?.count || 0, percentage: mediaSourcesIndustry?.printMedia?.percentage || 0 },
      { label: 'Radio', value: mediaSourcesIndustry?.radio?.count || 0, percentage: mediaSourcesIndustry?.radio?.percentage || 0 },
      { label: 'TV', value: mediaSourcesIndustry?.tv?.count || 0, percentage: mediaSourcesIndustry?.tv?.percentage || 0 },
    ]

    drawPieChart(doc, mediaPieData, 230, 270, 110, [ORANGE, DARK_TEXT, PURPLE, GRAY_TEXT])

    const sortedSources = [...mediaPieData].sort((a, b) => b.value - a.value)
    const industryLabel = data.industryName || 'sector'

    doc.setFontSize(14)
    doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
    const introText = `The ${industryLabel} continued to receive substantial media publicity during the period under review.`
    const introLines = doc.splitTextToSize(introText, 400)
    doc.text(introLines, 490, 90, { lineHeightFactor: 1.5 })

    doc.setFontSize(14)
    const totalText = `Total Coverage — ${(totalIndustryStories || 0).toLocaleString()} news stories from four media sources (print media, news website, radio and television).`
    const totalLines = doc.splitTextToSize(totalText, 400)
    doc.text(totalLines, 490, 160, { lineHeightFactor: 1.5 })

    doc.setFontSize(14)
    let bulletY = 250
    sortedSources.forEach((source, i) => {
      let bulletText = ''
      if (i === 0) bulletText = `${source.label} — highest: ${source.value} (${source.percentage}%)`
      else if (i === sortedSources.length - 1) bulletText = `${source.label} — lowest: ${source.value} (${source.percentage}%)`
      else bulletText = `${source.label}: ${source.value} (${source.percentage}%)`
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.text('•', 490, bulletY + i * 35)
      doc.text(bulletText, 510, bulletY + i * 35)
    })

    addSlideFooter(doc, logoBase64, pageNum)

    // ===== SLIDE 6: MONTHLY TREND =====
    addNewSlide(doc)
    pageNum++
    addSlideHeader(doc, 'Media Sources – Monthly Trend (Industry)')

    if (monthlyTrend && monthlyTrend.length > 0) {
      const categories = monthlyTrend.map((m: any) => m.month)
      const series = [
        { name: 'Print Media', values: monthlyTrend.map((m: any) => m.print), color: BLACK_RGB as RGB },
        { name: 'News Website', values: monthlyTrend.map((m: any) => m.web), color: ORANGE as RGB },
        { name: 'TV', values: monthlyTrend.map((m: any) => m.tv), color: PURPLE as RGB },
        { name: 'Radio', values: monthlyTrend.map((m: any) => m.radio), color: GRAY_TEXT as RGB },
      ]
      drawClusteredBarChart(doc, categories, series, 30, 70, 520, 380)

      const highestMonth = monthlyTrend.reduce((max: any, m: any) => (m.total || 0) > (max.total || 0) ? m : max, monthlyTrend[0])
      const lowestMonth = monthlyTrend.reduce((min: any, m: any) => (m.total || 0) < (min.total || 0) ? m : min, monthlyTrend[0])

      doc.setFontSize(20)
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.setFont('helvetica', 'bold')
      doc.text('Period Under Review', 600, 140)
      doc.setFont('helvetica', 'normal')

      doc.setFontSize(15)
      doc.setTextColor(GREEN[0], GREEN[1], GREEN[2])
      doc.setFont('helvetica', 'bold')
      doc.text(`${highestMonth?.month}`, 600, 200)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(14)
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.text(`${(highestMonth?.total || 0).toLocaleString()} articles (Highest)`, 600, 222)

      doc.setFontSize(15)
      doc.setTextColor(RED[0], RED[1], RED[2])
      doc.setFont('helvetica', 'bold')
      doc.text(`${lowestMonth?.month}`, 600, 280)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(14)
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.text(`${(lowestMonth?.total || 0).toLocaleString()} articles (Lowest)`, 600, 302)
    }

    addSlideFooter(doc, logoBase64, pageNum)

    // ===== SLIDE 7: THEMATIC AREAS =====
    addNewSlide(doc)
    pageNum++
    addSlideHeader(doc, 'Thematic Areas of Coverage - Industry')

    if (thematicAreas && thematicAreas.length > 0) {
      const maxWeight = Math.max(...thematicAreas.map((a: any) => a.weight), 1)
      const tags = thematicAreas.slice(0, 20)
      const gridLeft = 60
      const gridTop = 80
      const gridMaxWidth = SLIDE_WIDTH - 120
      const tagPadX = 20
      const tagPadY = 8
      const tagGap = 12
      const rowGap = 14

      let curX = gridLeft
      let curY = gridTop

      tags.forEach((item: any) => {
        const ratio = item.weight / maxWeight
        const fontSize = Math.max(14, Math.min(28, Math.round(14 + ratio * 14)))
        doc.setFontSize(fontSize)
        const labelText = `${item.keyword} (${item.weight})`
        const textWidth = doc.getTextWidth(labelText)
        const boxW = textWidth + tagPadX * 2
        const boxH = fontSize + tagPadY * 2

        if (curX + boxW > gridLeft + gridMaxWidth) {
          curX = gridLeft
          curY += boxH + rowGap
        }

        if (curY + boxH > CONTENT_BOTTOM - 10) return

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

        doc.roundedRect(curX, curY, boxW, boxH, 4, 4, 'F')
        doc.setFontSize(fontSize)
        doc.text(labelText, curX + boxW / 2, curY + boxH / 2 + fontSize * 0.3, { align: 'center' })
        curX += boxW + tagGap
      })
    }

    addSlideFooter(doc, logoBase64, pageNum)


    // ===== SLIDE 7b: KEY PERSONALITIES - INDUSTRY =====
    const kpIndustry = data.keyPersonalitiesIndustry || []
    if (kpIndustry.length > 0) {
      addNewSlide(doc)
      pageNum++
      addSlideHeader(doc, 'Key Personalities (Industry) – Top 10')
      const kpMaxCount = Math.max(...kpIndustry.map((p: any) => p.count), 1)
      kpIndustry.slice(0, 10).forEach((p: any, i: number) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const cardX = 40 + col * 460
        const cardY = 75 + row * 78
        const cardW = 420
        const cardH = 62
        if (cardY + cardH > CONTENT_BOTTOM - 10) return
        doc.setFillColor(249, 250, 251)
        doc.roundedRect(cardX, cardY, cardW, cardH, 6, 6, 'F')
        doc.setDrawColor(229, 231, 235)
        doc.setLineWidth(0.5)
        doc.roundedRect(cardX, cardY, cardW, cardH, 6, 6, 'S')
        doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
        doc.circle(cardX + 28, cardY + 31, 17, 'F')
        doc.setFontSize(13)
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.text((i + 1).toString(), cardX + 28, cardY + 36, { align: 'center' })
        doc.setFontSize(13)
        doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
        doc.text(p.name, cardX + 56, cardY + 24)
        doc.setFont('helvetica', 'normal')
        const barW = Math.max((p.count / kpMaxCount) * (cardW - 80), 10)
        doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
        doc.roundedRect(cardX + 56, cardY + 36, barW, 12, 4, 4, 'F')
        doc.setFontSize(10)
        doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
        doc.text(p.count.toString(), cardX + 56 + barW + 8, cardY + 46)
      })
      addSlideFooter(doc, logoBase64, pageNum)
    }

    // ===== SLIDE 7c: KEY PERSONALITIES - CLIENT =====
    const kpClient = data.keyPersonalitiesClient || []
    if (kpClient.length > 0) {
      addNewSlide(doc)
      pageNum++
      addSlideHeader(doc, `Key Personalities (${clientName}) – Top 10`)
      const kpMaxCount = Math.max(...kpClient.map((p: any) => p.count), 1)
      kpClient.slice(0, 10).forEach((p: any, i: number) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const cardX = 40 + col * 460
        const cardY = 75 + row * 78
        const cardW = 420
        const cardH = 62
        if (cardY + cardH > CONTENT_BOTTOM - 10) return
        doc.setFillColor(249, 250, 251)
        doc.roundedRect(cardX, cardY, cardW, cardH, 6, 6, 'F')
        doc.setDrawColor(229, 231, 235)
        doc.setLineWidth(0.5)
        doc.roundedRect(cardX, cardY, cardW, cardH, 6, 6, 'S')
        doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
        doc.circle(cardX + 28, cardY + 31, 17, 'F')
        doc.setFontSize(13)
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.text((i + 1).toString(), cardX + 28, cardY + 36, { align: 'center' })
        doc.setFontSize(13)
        doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
        doc.text(p.name, cardX + 56, cardY + 24)
        doc.setFont('helvetica', 'normal')
        const barW = Math.max((p.count / kpMaxCount) * (cardW - 80), 10)
        doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
        doc.roundedRect(cardX + 56, cardY + 36, barW, 12, 4, 4, 'F')
        doc.setFontSize(10)
        doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
        doc.text(p.count.toString(), cardX + 56 + barW + 8, cardY + 46)
      })
      addSlideFooter(doc, logoBase64, pageNum)
    }

    // ===== SLIDE 8: KEY JOURNALISTS =====
    addNewSlide(doc)
    pageNum++
    addSlideHeader(doc, 'Key Journalists – Top 5')

    if (topJournalists && topJournalists.length > 0) {
      const top5 = topJournalists.slice(0, 5)
      const maxCount = Math.max(...top5.map((j: any) => j.count), 1)
      const barWidth = 110
      const maxBarHeight = 240
      const startX = 130
      const barGap = 155
      const baseY = 380

      top5.forEach((j: any, i: number) => {
        const barX = startX + i * barGap
        const barHeight = (j.count / maxCount) * maxBarHeight
        const barY = baseY - barHeight
        doc.setFontSize(15)
        doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
        doc.setFont('helvetica', 'bold')
        doc.text(j.count.toString(), barX + barWidth / 2, barY - 12, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        doc.setFillColor(BLACK_RGB[0], BLACK_RGB[1], BLACK_RGB[2])
        doc.rect(barX, barY, barWidth, barHeight, 'F')
        doc.setFontSize(12)
        doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
        doc.setFont('helvetica', 'bold')
        const nameLines = doc.splitTextToSize(`${j.name},`, barWidth + 20)
        doc.text(nameLines, barX + barWidth / 2, baseY + 18, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(11)
        doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
        const outletLines = doc.splitTextToSize(j.outlet, barWidth + 20)
        doc.text(outletLines, barX + barWidth / 2, baseY + 40, { align: 'center' })
      })
    }

    addSlideFooter(doc, logoBase64, pageNum)

    // ===== SLIDE 9: SECTION DIVIDER - Client Visibility =====
    addNewSlide(doc)
    pageNum++
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
    doc.rect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, 'F')
    doc.setFontSize(38)
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
    doc.setFont('helvetica', 'bold')
    doc.text('Visibility of', SLIDE_WIDTH / 2, 230, { align: 'center' })
    doc.setFontSize(30)
    doc.setFont('helvetica', 'normal')
    doc.text(clientName, SLIDE_WIDTH / 2, 280, { align: 'center' })
    if (logoBase64) {
      try { doc.addImage(logoBase64, 'AUTO', SLIDE_WIDTH / 2 - 45, SLIDE_HEIGHT - 70, 90, 35) } catch {}
    }

    // ===== SLIDE 10: CLIENT VISIBILITY =====
    addNewSlide(doc)
    pageNum++
    addSlideHeader(doc, `Client Visibility — ${clientName}`)

    if (orgVisibility && orgVisibility.length > 0) {
      const visData = orgVisibility.map((o: any) => ({ label: o.name, value: o.mentions }))
      drawPieChart(doc, visData, 200, 270, 95, [DARK_TEXT, ORANGE, RED, [59, 130, 246], GRAY_TEXT])
    }

    if (clientSourcesOfMentions) {
      doc.setFontSize(15)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.text(`Sources of Mentions — ${clientName}`, 480, 80)
      doc.setFont('helvetica', 'normal')
      const sourceData = [
        { label: 'Print', value: clientSourcesOfMentions.printMedia || 0 },
        { label: 'Web', value: clientSourcesOfMentions.newsWebsite || 0 },
        { label: 'TV', value: clientSourcesOfMentions.tv || 0 },
        { label: 'Radio', value: clientSourcesOfMentions.radio || 0 },
      ]
      drawBarChart(doc, sourceData, 430, 95, 460, 170, [ORANGE])
    }

    if (clientMonthlyTrend && clientMonthlyTrend.length > 0) {
      doc.setFontSize(15)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.text(`Trend of Mentions — ${clientName}`, 480, 295)
      doc.setFont('helvetica', 'normal')
      const trendData = clientMonthlyTrend.map((m: any) => ({ label: m.month, value: m.count }))
      drawBarChart(doc, trendData, 430, 310, 460, 150, [RED])
    }

    addSlideFooter(doc, logoBase64, pageNum)

    // ===== SLIDE 11: MAJOR STORIES =====
    if (clientMajorStories && clientMajorStories.length > 0) {
      addNewSlide(doc)
      pageNum++
      addSlideHeader(doc, `Major Stories – ${clientName}`)

      clientMajorStories.slice(0, 6).forEach((story: any, i: number) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const cardX = 30 + col * 465
        const cardY = 75 + row * 145
        const cardW = 435
        const cardH = 130

        if (cardY + cardH > CONTENT_BOTTOM - 10) return

        doc.setFillColor(255, 248, 240)
        doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'F')
        doc.setDrawColor(253, 232, 208)
        doc.setLineWidth(0.5)
        doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'S')
        doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2])
        doc.rect(cardX, cardY, 3, cardH, 'F')

        const textX = cardX + 14
        const textW = cardW - 24

        doc.setFontSize(11)
        doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2])
        doc.setFont('helvetica', 'bold')
        doc.text(story.date || '', textX, cardY + 18)

        doc.setFontSize(14)
        doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
        const titleLines = doc.splitTextToSize(stripMarkdown(story.title || ''), textW)
        doc.text(titleLines.slice(0, 2), textX, cardY + 38)
        doc.setFont('helvetica', 'normal')

        doc.setFontSize(12)
        doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
        const summaryLines = doc.splitTextToSize(stripMarkdown(story.summary?.substring(0, 200) || ''), textW)
        doc.text(summaryLines.slice(0, 4), textX, cardY + 70, { lineHeightFactor: 1.4 })
      })

      addSlideFooter(doc, logoBase64, pageNum)
    }

    // ===== SLIDE 12: SECTION DIVIDER - Competitors =====
    addNewSlide(doc)
    pageNum++
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
    doc.rect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, 'F')
    doc.setFontSize(38)
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
    doc.setFont('helvetica', 'bold')
    doc.text('Visibility of', SLIDE_WIDTH / 2, 230, { align: 'center' })
    doc.setFontSize(30)
    doc.setFont('helvetica', 'normal')
    doc.text('Competitors', SLIDE_WIDTH / 2, 280, { align: 'center' })
    if (logoBase64) {
      try { doc.addImage(logoBase64, 'AUTO', SLIDE_WIDTH / 2 - 45, SLIDE_HEIGHT - 70, 90, 35) } catch {}
    }

    // ===== SLIDE 13: COMPETITOR PRESENCE =====
    addNewSlide(doc)
    pageNum++
    addSlideHeader(doc, 'Competitor Presence – Top 5 Sector Players')

    if (competitorAnalysis && competitorAnalysis.length > 0) {
      const compData: { label: string; value: number }[] = competitorAnalysis.slice(0, 5).map((c: any) => ({ label: c.name, value: c.mentions }))
      drawPieChart(doc, compData, 230, 270, 110, [GRAY_TEXT, [59, 130, 246], ORANGE, DARK_TEXT, PURPLE])

      const totalMentions = compData.reduce((sum, c) => sum + c.value, 0)
      doc.setFontSize(14)
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      const compSummary = `Overall, the presence of companies in the media remained competitive. A total of ${totalMentions.toLocaleString()} mentions.`
      const compLines = doc.splitTextToSize(compSummary, 380)
      doc.text(compLines, 490, 120, { lineHeightFactor: 1.5 })

      doc.setFontSize(14)
      compData.forEach((c, i) => {
        const cy = 200 + i * 32
        if (cy > CONTENT_BOTTOM - 20) return
        doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
        doc.text('•', 490, cy)
        doc.text(`${c.label}: ${c.value}`, 510, cy)
      })
    }

    addSlideFooter(doc, logoBase64, pageNum)

    // ===== SLIDES: MAJOR STORIES PER COMPETITOR =====
    if (competitorAnalysis && competitorAnalysis.length > 0) {
      competitorAnalysis.slice(0, 5).forEach((competitor: any) => {
        if (competitor.majorStories && competitor.majorStories.length > 0) {
          addNewSlide(doc)
          pageNum++
          addSlideHeader(doc, `Major Stories – ${competitor.name}`)

          competitor.majorStories.slice(0, 6).forEach((story: any, i: number) => {
            const col = i % 2
            const row = Math.floor(i / 2)
            const cardX = 30 + col * 465
            const cardY = 75 + row * 145
            const cardW = 435
            const cardH = 130

            if (cardY + cardH > CONTENT_BOTTOM - 10) return

            doc.setFillColor(255, 248, 240)
            doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'F')
            doc.setDrawColor(253, 232, 208)
            doc.setLineWidth(0.5)
            doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'S')
            doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2])
            doc.rect(cardX, cardY, 3, cardH, 'F')

            const textX = cardX + 14
            const textW = cardW - 24

            doc.setFontSize(11)
            doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2])
            doc.setFont('helvetica', 'bold')
            doc.text(story.date || '', textX, cardY + 18)

            doc.setFontSize(14)
            doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
            const titleLines = doc.splitTextToSize(stripMarkdown(story.title || ''), textW)
            doc.text(titleLines.slice(0, 2), textX, cardY + 38)
            doc.setFont('helvetica', 'normal')

            doc.setFontSize(12)
            doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2])
            const summaryLines = doc.splitTextToSize(stripMarkdown(story.summary?.substring(0, 200) || ''), textW)
            doc.text(summaryLines.slice(0, 4), textX, cardY + 70, { lineHeightFactor: 1.4 })
          })

          addSlideFooter(doc, logoBase64, pageNum)
        }
      })
    }

    // ===== SLIDE: SENTIMENTS =====
    addNewSlide(doc)
    pageNum++
    addSlideHeader(doc, 'Story Orientation - Sentiments')

    if (industrySentiment) {
      const sentimentData = [
        { label: 'Positive', value: industrySentiment.positive?.count || 0 },
        { label: 'Negative', value: industrySentiment.negative?.count || 0 },
        { label: 'Neutral', value: industrySentiment.neutral?.count || 0 },
      ]
      drawPieChart(doc, sentimentData, 200, 250, 95, [GREEN, RED, [234, 179, 8]])

      if (clientSentiment) {
        doc.setFontSize(15)
        doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
        doc.setFont('helvetica', 'bold')
        doc.text(`${clientName} Sentiment`, 480, 100)
        doc.setFont('helvetica', 'normal')
        const clientSentData = [
          { label: 'Positive', value: clientSentiment.positive || 0 },
          { label: 'Negative', value: clientSentiment.negative || 0 },
          { label: 'Neutral', value: clientSentiment.neutral || 0 },
        ]
        drawBarChart(doc, clientSentData, 420, 115, 460, 190, [GREEN, RED, [234, 179, 8]])
      }

      const total = sentimentData.reduce((sum, s) => sum + s.value, 0)
      doc.setFontSize(14)
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
      doc.setFont('helvetica', 'bold')
      doc.text(`Out of ${total.toLocaleString()} stories:`, 430, 350)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(14)
      doc.text('•', 430, 380)
      doc.text(`${industrySentiment.positive?.percentage || 0}% were positive`, 450, 380)
      doc.text('•', 430, 408)
      doc.text(`${industrySentiment.negative?.percentage || 0}% were negative`, 450, 408)
      doc.text('•', 430, 436)
      doc.text(`${industrySentiment.neutral?.percentage || 0}% were neutral`, 450, 436)
    }

    addSlideFooter(doc, logoBase64, pageNum)

    // ===== SLIDE: KEY TAKEOUTS =====
    addNewSlide(doc)
    pageNum++

    doc.setFontSize(24)
    doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2])
    doc.setFont('helvetica', 'bold')
    doc.text('Key Takeouts - Conclusions', 40, 45)
    doc.setFont('helvetica', 'normal')

    if (keyTakeouts && keyTakeouts.length > 0) {
      let curY = 85
      keyTakeouts.slice(0, 8).forEach((takeout: string, i: number) => {
        if (curY > CONTENT_BOTTOM - 30) return
        const color = i % 2 === 1 ? ORANGE : DARK_TEXT
        const cleaned = stripMarkdown(takeout)
        doc.setFontSize(14)
        doc.setTextColor(color[0], color[1], color[2])
        const lines = doc.splitTextToSize(cleaned, 840)
        const linesToRender = lines.slice(0, 3)
        
        // Bullet marker
        doc.setFontSize(16)
        doc.text('›', 40, curY)
        
        doc.setFontSize(14)
        linesToRender.forEach((line: string, li: number) => {
          if (curY > CONTENT_BOTTOM - 15) return
          doc.text(line, 60, curY)
          curY += 20
        })
        curY += 12 // gap between takeouts
      })
    }

    addSlideFooter(doc, logoBase64, pageNum)

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
