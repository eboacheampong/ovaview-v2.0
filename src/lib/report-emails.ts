import { Resend } from 'resend'
import { WeeklyReportData, MonthlyReportData, formatNumber } from './ai-report-service'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.EMAIL_FROM || 'Ovaview <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const LOGO_URL = `${APP_URL}/Ovaview-Media-Monitoring-Logo.png`

// ─── Smart Subject Line Builder ──────────────────────────────────────

function buildSmartDateLabel(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1

  // Check if it's exactly a calendar month
  if (start.getDate() === 1) {
    const lastOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    if (end.getDate() === lastOfMonth.getDate() && start.getMonth() === end.getMonth()) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      return `${monthNames[start.getMonth()]} ${start.getFullYear()}`
    }
  }

  // Check if it's a full year
  if (start.getMonth() === 0 && start.getDate() === 1 && end.getMonth() === 11 && end.getDate() === 31 && start.getFullYear() === end.getFullYear()) {
    return `${start.getFullYear()} Annual`
  }

  // Check common day ranges
  if (diffDays <= 1) return 'Daily'
  if (diffDays >= 6 && diffDays <= 8) return 'Weekly'
  if (diffDays >= 28 && diffDays <= 31) return 'Monthly'
  if (diffDays >= 88 && diffDays <= 92) return 'Quarterly'

  // Custom range — use readable dates
  const fmtShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmtShort(start)} - ${fmtShort(end)}`
}

// ─── Send Weekly Report Email ────────────────────────────────────────

export async function sendWeeklyReportEmail(
  data: WeeklyReportData,
  recipientEmail: string,
  recipientName?: string
) {
  const html = generateWeeklyEmailHtml(data, recipientName)
  const changeDir = data.comparison.mentionChangePercent >= 0 ? '↑' : '↓'
  const changeAbs = Math.abs(data.comparison.mentionChangePercent)
  const dateLabel = buildSmartDateLabel(data.dateRange.start, data.dateRange.end)

  const subject = `Media & AI Insights (${dateLabel}): ${data.clientName} | ${changeDir}${changeAbs}% Mentions`

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: recipientEmail,
    subject,
    html,
  })

  if (error) throw new Error(`Failed to send weekly report: ${error.message}`)
}

// ─── Send Monthly Report Email ───────────────────────────────────────

export async function sendMonthlyReportEmail(
  data: MonthlyReportData,
  recipientEmail: string,
  recipientName?: string
) {
  const html = generateMonthlyEmailHtml(data, recipientName)
  const changeDir = data.comparison.mentionChangePercent >= 0 ? 'Increase' : 'Decrease'
  const changeAbs = Math.abs(data.comparison.mentionChangePercent)
  const dateLabel = buildSmartDateLabel(data.dateRange.start, data.dateRange.end)

  const subject = `AI Insights Report (${dateLabel}) | ${changeAbs}% ${changeDir} in ${data.clientName} Mentions`

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: recipientEmail,
    subject,
    html,
  })

  if (error) throw new Error(`Failed to send monthly report: ${error.message}`)
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateRange(start: Date, end: Date): string {
  return `${start.toISOString().split('T')[0]} – ${end.toISOString().split('T')[0]}`
}

function changeArrow(val: number): string {
  if (val > 0) return `<span style="color:#22c55e;">↑${Math.abs(val)}%</span>`
  if (val < 0) return `<span style="color:#ef4444;">↓${Math.abs(val)}%</span>`
  return `<span style="color:#94a3b8;">0%</span>`
}

function sentimentBar(positive: number, neutral: number, negative: number): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:6px;overflow:hidden;height:8px;">
      <tr>
        ${positive > 0 ? `<td width="${positive}%" style="background:#22c55e;height:8px;"></td>` : ''}
        ${neutral > 0 ? `<td width="${neutral}%" style="background:#94a3b8;height:8px;"></td>` : ''}
        ${negative > 0 ? `<td width="${negative}%" style="background:#ef4444;height:8px;"></td>` : ''}
      </tr>
    </table>`
}

function statCard(emoji: string, value: string, label: string, change?: string): string {
  return `
    <td class="stat-cell" width="25%" align="center" style="padding:4px;">
      <table cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;width:100%;">
        <tr><td align="center" style="padding:14px 6px 4px;">
          <div style="font-size:22px;font-weight:800;color:#0f172a;">${value}</div>
        </td></tr>
        <tr><td align="center" style="padding:0 6px;">
          <div style="font-size:9px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
        </td></tr>
        ${change ? `<tr><td align="center" style="padding:4px 4px 10px;">
          <div style="font-size:10px;line-height:1.3;">${change}</div>
        </td></tr>` : `<tr><td style="padding:0 0 10px;"></td></tr>`}
      </table>
    </td>`
}


// ─── Weekly Email Template ───────────────────────────────────────────

function generateWeeklyEmailHtml(data: WeeklyReportData, recipientName?: string): string {
  const { stats, comparison, aiSummary, sentimentBreakdown, topAuthors } = data
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,'

  const topMentionsHtml = stats.topMentions.slice(0, 6).map(m => {
    const sentColor = m.sentiment?.toLowerCase() === 'positive' ? '#22c55e' : m.sentiment?.toLowerCase() === 'negative' ? '#ef4444' : '#94a3b8'
    return `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align:top;padding-right:12px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${sentColor};margin-top:6px;"></span>
            </td>
            <td width="100%">
              <a href="${m.url || '#'}" style="color:#0f172a;font-weight:600;font-size:13px;text-decoration:none;line-height:1.4;">${m.title.substring(0, 90)}${m.title.length > 90 ? '...' : ''}</a>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px;">
                ${m.source} · ${formatNumber(m.reach)} reach${m.followers ? ` · ${formatNumber(m.followers)} followers` : ''}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
  }).join('')

  const topAuthorsHtml = topAuthors.map((a, i) => `
    <tr>
      <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="24" style="vertical-align:middle;">
              <div style="width:22px;height:22px;border-radius:50%;background:#f97316;color:#fff;font-size:10px;font-weight:700;text-align:center;line-height:22px;">${i + 1}</div>
            </td>
            <td style="padding-left:8px;vertical-align:middle;">
              <span style="font-size:13px;font-weight:600;color:#0f172a;">${a.name}</span>
            </td>
            <td align="right" style="vertical-align:middle;">
              <span style="font-size:12px;color:#64748b;">${a.mentions} mentions · ${formatNumber(a.reach)} reach</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
  ).join('')

  const sourceDistHtml = data.sourceDistribution.map(s => {
    const colors: Record<string, string> = { Web: '#3b82f6', TV: '#8b5cf6', Radio: '#f59e0b', Print: '#10b981', Social: '#ec4899' }
    const color = colors[s.source] || '#94a3b8'
    return `
    <tr>
      <td style="padding:3px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="60" style="font-size:11px;font-weight:600;color:#64748b;">${s.source}</td>
            <td style="padding:0 8px;">
              <div style="background:#f1f5f9;border-radius:4px;height:6px;overflow:hidden;">
                <div style="background:${color};height:6px;width:${Math.max(s.percentage, 2)}%;border-radius:4px;"></div>
              </div>
            </td>
            <td width="40" align="right" style="font-size:11px;font-weight:700;color:#0f172a;">${s.percentage}%</td>
          </tr>
        </table>
      </td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Weekly Media Report</title>
  <style>
    @media only screen and (max-width:620px) {
      .email-container { width:100% !important; }
      .mobile-pad { padding-left:12px !important; padding-right:12px !important; }
      .stat-cell { display:block !important; width:48% !important; float:left !important; box-sizing:border-box !important; }
      .stat-row { display:block !important; overflow:hidden !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f8f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f7f5;">
<tr><td align="center" style="padding:24px 10px;">
<table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td class="mobile-pad" style="padding:20px 24px 14px;border-bottom:1px solid #f1f5f9;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td><img src="${LOGO_URL}" alt="Ovaview" height="28" style="height:28px;width:auto;" /></td>
        <td align="right"><span style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">WEEKLY REPORT</span></td>
      </tr>
    </table>
  </td></tr>

  <!-- Hero -->
  <tr><td class="mobile-pad" style="padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);border-radius:12px;">
      <tr><td style="padding:24px;">
        <div style="font-size:10px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">Weekly Media & AI Insights</div>
        <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">Top Mentions for ${data.clientName}</h1>
        <p style="margin:0 0 4px;font-size:13px;color:#94a3b8;">${greeting} Here's your weekly media performance summary.</p>
        <p style="margin:0;font-size:12px;color:#64748b;">${formatDateRange(data.dateRange.start, data.dateRange.end)}</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Stats Cards -->
  <tr><td class="mobile-pad" style="padding:0 24px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f7f5;border-radius:12px;padding:4px;">
      <tr class="stat-row">
        ${statCard('📊', stats.total.toString(), 'Total Mentions', changeArrow(comparison.mentionChangePercent) + ' from last week')}
        ${statCard('📡', formatNumber(stats.totalReach), 'Total Reach', changeArrow(comparison.reachChangePercent) + ' from last week')}
        ${statCard('👍', stats.positive.toString(), 'Positive', changeArrow(comparison.previous.positive > 0 ? Math.round(((stats.positive - comparison.previous.positive) / comparison.previous.positive) * 100) : 0) + ' from last week')}
        ${statCard('👎', stats.negative.toString(), 'Negative', comparison.negativeChange > 0 ? `<span style="color:#ef4444;">+${comparison.negativeChange}</span>` : comparison.negativeChange < 0 ? `<span style="color:#22c55e;">${comparison.negativeChange}</span>` : '<span style="color:#94a3b8;">0</span>')}
      </tr>
    </table>
  </td></tr>

  <!-- AI Summary -->
  <tr><td class="mobile-pad" style="padding:0 24px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;">
      <tr><td style="padding:16px 20px;">
        <div style="font-size:10px;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">🤖 AI Summary</div>
        <p style="margin:0;font-size:13px;color:#44403c;line-height:1.6;">${aiSummary}</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Sentiment -->
  <tr><td class="mobile-pad" style="padding:0 24px 20px;">
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Sentiment Breakdown</div>
    ${sentimentBar(sentimentBreakdown.positive, sentimentBreakdown.neutral, sentimentBreakdown.negative)}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
      <tr>
        <td style="font-size:11px;color:#22c55e;font-weight:600;">● Positive ${sentimentBreakdown.positive}%</td>
        <td align="center" style="font-size:11px;color:#94a3b8;font-weight:600;">● Neutral ${sentimentBreakdown.neutral}%</td>
        <td align="right" style="font-size:11px;color:#ef4444;font-weight:600;">● Negative ${sentimentBreakdown.negative}%</td>
      </tr>
    </table>
  </td></tr>

  <!-- Source Distribution -->
  <tr><td class="mobile-pad" style="padding:0 24px 20px;">
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Source Distribution</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">${sourceDistHtml}</table>
  </td></tr>

  <!-- Mentions vs Reach Chart -->
  <tr><td class="mobile-pad" style="padding:0 24px 20px;">
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">📊 Mentions vs Reach by Type</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr style="background:#f8f7f5;">
        <td style="padding:8px 12px;font-size:10px;font-weight:700;color:#64748b;">Type</td>
        <td style="padding:8px 12px;font-size:10px;font-weight:700;color:#64748b;" align="center">Mentions</td>
        <td style="padding:8px 12px;font-size:10px;font-weight:700;color:#64748b;" align="right">Reach</td>
      </tr>
      ${[
        { type: 'Web', count: stats.web, color: '#3b82f6' },
        { type: 'TV', count: stats.tv, color: '#8b5cf6' },
        { type: 'Radio', count: stats.radio, color: '#f59e0b' },
        { type: 'Print', count: stats.print, color: '#10b981' },
        { type: 'Social', count: stats.social, color: '#ec4899' },
      ].filter(t => t.count > 0).map(t => {
        const typeReach = stats.bySource.filter(s => {
          // Rough mapping - social sources start with @
          if (t.type === 'Social') return s.name.startsWith('@')
          return false
        }).reduce((sum, s) => sum + s.reach, 0) || (t.type !== 'Social' ? Math.round(stats.totalReach * (t.count / (stats.total || 1))) : 0)
        return `<tr style="border-top:1px solid #f1f5f9;">
          <td style="padding:8px 12px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${t.color};margin-right:6px;vertical-align:middle;"></span>
            <span style="font-size:12px;font-weight:600;color:#374151;">${t.type}</span>
          </td>
          <td style="padding:8px 12px;" align="center"><span style="font-size:13px;font-weight:700;color:#0f172a;">${t.count}</span></td>
          <td style="padding:8px 12px;" align="right"><span style="font-size:12px;color:#64748b;">${formatNumber(typeReach)}</span></td>
        </tr>`
      }).join('')}
    </table>
  </td></tr>

  <!-- Top Mentions -->
  <tr><td class="mobile-pad" style="padding:0 24px 20px;">
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Mentions & Reach – Most Interesting</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">${topMentionsHtml}</table>
  </td></tr>

  <!-- Social Platform Breakdown -->
  ${stats.socialByPlatform.length > 0 ? `
  <tr><td class="mobile-pad" style="padding:0 24px 20px;">
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">📱 Social Media by Platform</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      ${stats.socialByPlatform.map(p => {
        const platformColors: Record<string, string> = { TWITTER: '#1da1f2', YOUTUBE: '#ff0000', FACEBOOK: '#1877f2', LINKEDIN: '#0a66c2', INSTAGRAM: '#e4405f', TIKTOK: '#000000' }
        const platformNames: Record<string, string> = { TWITTER: 'Twitter/X', YOUTUBE: 'YouTube', FACEBOOK: 'Facebook', LINKEDIN: 'LinkedIn', INSTAGRAM: 'Instagram', TIKTOK: 'TikTok' }
        const color = platformColors[p.platform] || '#94a3b8'
        const name = platformNames[p.platform] || p.platform
        const pct = stats.social > 0 ? Math.round((p.count / stats.social) * 100) : 0
        return `<tr style="border-top:1px solid #f1f5f9;">
          <td style="padding:8px 12px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px;vertical-align:middle;"></span>
            <span style="font-size:12px;font-weight:600;color:#374151;">${name}</span>
          </td>
          <td style="padding:8px 12px;" align="center"><span style="font-size:13px;font-weight:700;color:#0f172a;">${p.count}</span> <span style="font-size:10px;color:#94a3b8;">(${pct}%)</span></td>
          <td style="padding:8px 12px;" align="right"><span style="font-size:12px;color:#64748b;">${formatNumber(p.reach)} reach</span></td>
        </tr>`
      }).join('')}
    </table>
  </td></tr>` : ''}

  <!-- Top Authors -->
  ${topAuthors.length > 0 ? `
  <tr><td class="mobile-pad" style="padding:0 24px 20px;">
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Top Authors / Sources</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">${topAuthorsHtml}</table>
  </td></tr>` : ''}

  <!-- CTA -->
  <tr><td style="padding:24px;text-align:center;background:#fafaf9;border-top:1px solid #e2e8f0;">
    <a href="${APP_URL}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;">View Full Dashboard</a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 24px;text-align:center;background:#f8f7f5;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Powered by Ovaview Media Monitoring</p>
    <p style="margin:0;font-size:11px;color:#cbd5e1;">© ${new Date().getFullYear()} Ovaview. All rights reserved.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}


// ─── Monthly Email Template ──────────────────────────────────────────

function generateMonthlyEmailHtml(data: MonthlyReportData, recipientName?: string): string {
  const { stats, comparison, aiInsights, aiTrends, aiRecommendations, headline, sentimentBreakdown } = data
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const monthName = monthNames[data.dateRange.start.getMonth()]
  const year = data.dateRange.start.getFullYear()

  // Normalize AI text: fix ., separators and strip markdown formatting
  const normalizeParas = (text: string) => text
    .replace(/\.,\s*(?=[A-Z])/g, '.\n\n')  // .,Capital → paragraph break
    .replace(/\.\s*,\s*(?=[A-Z])/g, '.\n\n')
  const stripMarkdown = (text: string) => text
    .replace(/\*\*([^*]+)\*\*/g, '$1')     // **bold** → bold
    .replace(/\*([^*]+)\*/g, '$1')          // *italic* → italic
    .replace(/^#+\s*/gm, '')                // # headers → plain
    .replace(/^Recommendation\s*\d+:\s*/gi, '')  // "Recommendation 1:" prefix
    .replace(/^Insight\s*\d+:\s*/gi, '')         // "Insight 1:" prefix
    .replace(/^\d+\.\s+/gm, '')                  // "1. " numbered prefix
  const isPreamble = (text: string) => {
    const t = text.trim().toLowerCase()
    return t.startsWith('here are') || t.startsWith('based on the data') ||
      t.startsWith('based on the media') || t.startsWith('below are') ||
      t.startsWith('the following') || (t.endsWith(':') && t.length < 120)
  }
  // Merge short title-like lines with the next paragraph
  const mergeShortTitles = (paragraphs: string[]): string[] => {
    const merged: string[] = []
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i].trim()
      // If this is a short line (likely a title) and there's a next paragraph, merge them
      if (p.length < 100 && !p.endsWith('.') && i + 1 < paragraphs.length) {
        merged.push(`${p}: ${paragraphs[i + 1].trim()}`)
        i++ // skip next since we merged it
      } else if (p.length < 80 && i + 1 < paragraphs.length && paragraphs[i + 1].trim().length > p.length * 2) {
        // Also catch short lines ending with period but clearly a title (next para is much longer)
        merged.push(`${p} ${paragraphs[i + 1].trim()}`)
        i++
      } else {
        merged.push(p)
      }
    }
    return merged
  }

  // Format insights — split by double newline, merge title+body, render each as a paragraph
  const rawInsights = normalizeParas(aiInsights).split(/\n\n+/).filter(Boolean)
    .map(p => stripMarkdown(p).trim().replace(/\.,?\s*$/, '.'))
    .filter(p => p.length > 10 && !isPreamble(p))
  const insightParagraphs = mergeShortTitles(rawInsights)
    .filter(p => p.length > 20)
    .map(p => `<p style="margin:0 0 14px;font-size:13px;color:#374151;line-height:1.7;">${p}</p>`)
    .join('')

  // Format trends as bullet list — handle AI returning .,• or .• or ,• as separators
  const normalizedTrends = aiTrends
    .replace(/\.,\s*•/g, '\n•')   // .,• → newline
    .replace(/\.\s*•/g, '\n•')    // .• → newline
    .replace(/,\s*•/g, '\n•')     // ,• → newline
  const trendItems = normalizedTrends.split('\n').filter(l => l.trim()).map(l => {
    const text = stripMarkdown(l).replace(/^[•\-\*]\s*/, '').replace(/\.,?\s*$/, '').trim()
    if (!text || text.length < 5 || isPreamble(text)) return ''
    return `<tr><td style="padding:5px 0;font-size:13px;color:#374151;line-height:1.5;">
      <span style="color:#f97316;font-weight:700;margin-right:6px;">•</span>${text}
    </td></tr>`
  }).filter(Boolean).join('')

  // Format recommendations as numbered paragraphs — merge title+body, strip preambles and markdown
  const rawRecs = normalizeParas(aiRecommendations).split(/\n\n+/).filter(Boolean)
    .map(p => stripMarkdown(p).trim().replace(/\.,?\s*$/, '.'))
    .filter(p => p.length > 10 && !isPreamble(p))
  const recItems = mergeShortTitles(rawRecs)
    .filter(p => p.length > 20)
    .map((p, i) =>
    `<tr><td style="padding:10px 0;${i > 0 ? 'border-top:1px solid #f1f5f9;' : ''}">
      <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td width="28" style="vertical-align:top;padding-top:2px;">
          <div style="background:#f97316;color:#fff;font-size:10px;font-weight:700;width:20px;height:20px;border-radius:50%;text-align:center;line-height:20px;">${i + 1}</div>
        </td>
        <td style="padding-left:8px;">
          <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">${p}</p>
        </td>
      </tr></table>
    </td></tr>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Monthly AI Insights Report</title>
  <style>
    @media only screen and (max-width:620px) {
      .email-container { width:100% !important; }
      .mobile-pad { padding-left:12px !important; padding-right:12px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f8f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f7f5;">
<tr><td align="center" style="padding:24px 10px;">
<table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td class="mobile-pad" style="padding:20px 24px 14px;border-bottom:1px solid #f1f5f9;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td><img src="${LOGO_URL}" alt="Ovaview" height="28" style="height:28px;width:auto;" /></td>
        <td align="right"><span style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">MONTHLY AI INSIGHTS</span></td>
      </tr>
    </table>
  </td></tr>

  <!-- Hero / Headline -->
  <tr><td class="mobile-pad" style="padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#334155 100%);border-radius:12px;">
      <tr><td style="padding:28px 24px;">
        <div style="font-size:10px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">🤖 ${monthName} ${year} AI Insights Report</div>
        <h1 style="margin:0 0 10px;font-size:18px;font-weight:700;color:#ffffff;line-height:1.35;">${headline}</h1>
        <p style="margin:0 0 4px;font-size:13px;color:#94a3b8;">Project: ${data.projectName}</p>
        <p style="margin:0;font-size:12px;color:#64748b;">${formatDateRange(data.dateRange.start, data.dateRange.end)}</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- AI Insights Section -->
  <tr><td class="mobile-pad" style="padding:0 24px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#0f172a;padding:14px 20px;">
        <span style="font-size:12px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:1px;">🧠 AI Insights</span>
      </td></tr>
      <tr><td style="padding:20px;">
        ${insightParagraphs}
      </td></tr>
    </table>
  </td></tr>

  <!-- Trends Section -->
  <tr><td class="mobile-pad" style="padding:0 24px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#f8f7f5;padding:14px 20px;border-bottom:1px solid #e2e8f0;">
        <span style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">📈 Trends – Month over Month</span>
      </td></tr>
      <tr><td style="padding:16px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">${trendItems}</table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Recommendations -->
  <tr><td class="mobile-pad" style="padding:0 24px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #fde68a;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#fffbeb;padding:14px 20px;border-bottom:1px solid #fde68a;">
        <span style="font-size:12px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:1px;">💡 Recommendations</span>
      </td></tr>
      <tr><td style="padding:16px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">${recItems}</table>
      </td></tr>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:24px;text-align:center;background:#fafaf9;border-top:1px solid #e2e8f0;">
    <a href="${APP_URL}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;">View Full Dashboard</a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 24px;text-align:center;background:#f8f7f5;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Powered by Ovaview Media Monitoring</p>
    <p style="margin:0;font-size:11px;color:#cbd5e1;">© ${new Date().getFullYear()} Ovaview. All rights reserved.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}
