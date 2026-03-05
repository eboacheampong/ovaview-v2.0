import { Resend } from 'resend'

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY)

// Log if API key is missing
if (!process.env.RESEND_API_KEY) {
  console.warn('[Email] RESEND_API_KEY is not set - emails will fail')
}

export interface MediaItem {
  id: string
  title: string
  summary?: string | null
  date: Date
  type: 'web' | 'tv' | 'radio' | 'print' | 'social'
  sourceUrl?: string | null
  internalUrl?: string | null
  imageUrl?: string | null
  publication?: string | null
  sentiment?: string | null
}

export interface NotificationEmailData {
  clientName: string
  recipientEmail: string
  recipientName?: string
  mediaItems: MediaItem[]
  dashboardUrl: string
  maxItemsToShow?: number
}

// For Resend free tier, use onboarding@resend.dev or a verified domain
// EMAIL_FROM should be either 'onboarding@resend.dev' for testing or 'name@your-verified-domain.com'
const FROM_EMAIL = process.env.EMAIL_FROM || 'Ovaview <onboarding@resend.dev>'
const MAX_ITEMS_DEFAULT = 10
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const LOGO_URL = `${APP_URL}/Ovaview-Media-Monitoring-Logo.png`

export async function sendNotificationEmail(data: NotificationEmailData) {
  const { clientName, recipientEmail, recipientName, mediaItems, dashboardUrl, maxItemsToShow = MAX_ITEMS_DEFAULT } = data
  
  console.log('[Email] Preparing to send notification email')
  console.log('[Email] From:', FROM_EMAIL)
  console.log('[Email] To:', recipientEmail)
  console.log('[Email] Items count:', mediaItems.length)
  
  const displayItems = mediaItems.slice(0, maxItemsToShow)
  const hasMore = mediaItems.length > maxItemsToShow
  const remainingCount = mediaItems.length - maxItemsToShow

  // Count by type
  const counts = {
    web: mediaItems.filter(i => i.type === 'web').length,
    tv: mediaItems.filter(i => i.type === 'tv').length,
    radio: mediaItems.filter(i => i.type === 'radio').length,
    print: mediaItems.filter(i => i.type === 'print').length,
    social: mediaItems.filter(i => i.type === 'social').length,
  }

  const html = generateEmailHtml({
    clientName,
    recipientName,
    items: displayItems,
    counts,
    hasMore,
    remainingCount,
    totalCount: mediaItems.length,
    dashboardUrl,
  })

  console.log('[Email] Sending via Resend...')
  
  try {
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: `Daily Media Update for ${clientName} - ${mediaItems.length} new ${mediaItems.length === 1 ? 'item' : 'items'}`,
      html,
    })

    if (error) {
      console.error('[Email] Resend error:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log('[Email] Successfully sent! ID:', result?.id)
    return result
  } catch (err) {
    console.error('[Email] Exception while sending:', err)
    throw err
  }
}

function getMediaTypeLabel(type: string): string {
  switch (type) {
    case 'web': return 'WEB'
    case 'tv': return 'TV'
    case 'radio': return 'RADIO'
    case 'print': return 'PRINT'
    case 'social': return 'SOCIAL'
    default: return 'MEDIA'
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return 'Just now'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase()
}

function getSentimentDot(sentiment?: string | null): string {
  if (!sentiment) return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#9ca3af;vertical-align:middle;"></span>'
  const s = sentiment.toLowerCase()
  if (s === 'positive') return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;vertical-align:middle;"></span>'
  if (s === 'negative') return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;vertical-align:middle;"></span>'
  return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#9ca3af;vertical-align:middle;"></span>'
}

interface EmailTemplateData {
  clientName: string
  recipientName?: string
  items: MediaItem[]
  counts: { web: number; tv: number; radio: number; print: number; social: number }
  hasMore: boolean
  remainingCount: number
  totalCount: number
  dashboardUrl: string
}

function generateEmailHtml(data: EmailTemplateData): string {
  const { clientName, recipientName, items, counts, hasMore, remainingCount, totalCount, dashboardUrl } = data
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,'

  const getItemLink = (item: MediaItem) => item.internalUrl || item.sourceUrl || dashboardUrl

  const mediaCardsHtml = items.map(item => `
    <tr><td style="padding:0 0 12px;">
      <a href="${getItemLink(item)}" style="text-decoration:none;display:block;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <tr>
            ${item.imageUrl ? `
            <td class="card-image" width="120" style="width:120px;min-width:120px;background:url('${item.imageUrl}') center/cover no-repeat #f1f5f9;">
              <div style="width:120px;font-size:0;line-height:0;">&nbsp;</div>
            </td>` : ''}
            <td style="vertical-align:top;padding:12px 14px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="background:#fff7ed;color:#f97316;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;text-transform:uppercase;border:1px solid #fed7aa;">${getMediaTypeLabel(item.type)}</span>
                  </td>
                  <td align="right" style="vertical-align:middle;">${getSentimentDot(item.sentiment)}</td>
                </tr>
              </table>
              <div style="color:#0f172a;font-weight:700;font-size:14px;line-height:1.35;margin-bottom:4px;">${item.title.length > 80 ? item.title.substring(0, 80) + '...' : item.title}</div>
              ${item.summary ? `<div class="card-summary" style="color:#64748b;font-size:12px;line-height:1.4;margin-bottom:6px;">${item.summary.substring(0, 100)}${item.summary.length > 100 ? '...' : ''}</div>` : ''}
              <div style="color:#94a3b8;font-size:10px;">${item.publication ? `${item.publication} · ` : ''}${formatTimeAgo(item.date)}</div>
            </td>
          </tr>
        </table>
      </a>
    </td></tr>`).join('')

  // Build active type pills
  const typePills = [
    { label: 'Web', count: counts.web, emoji: '🌐', color: '#3b82f6' },
    { label: 'TV', count: counts.tv, emoji: '📺', color: '#8b5cf6' },
    { label: 'Radio', count: counts.radio, emoji: '📻', color: '#f59e0b' },
    { label: 'Print', count: counts.print, emoji: '📰', color: '#10b981' },
    { label: 'Social', count: counts.social, emoji: '💬', color: '#ec4899' },
  ].filter(t => t.count > 0)

  const statCellsHtml = typePills.map(t => `
    <td align="center" style="padding:4px;">
      <table cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;width:100%;">
        <tr><td align="center" style="padding:12px 6px 4px;">
          <div style="font-size:20px;font-weight:800;color:#0f172a;">${t.count}</div>
        </td></tr>
        <tr><td align="center" style="padding:0 6px 10px;">
          <div style="font-size:9px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">${t.emoji} ${t.label}</div>
        </td></tr>
      </table>
    </td>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Daily Media Update</title>
  <style>
    @media only screen and (max-width:620px) {
      .email-container { width:100% !important; }
      .mobile-pad { padding-left:12px !important; padding-right:12px !important; }
      .card-image { width:100px !important; min-width:100px !important; }
      .card-image div { width:100px !important; }
      .card-summary { display:none !important; }
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
        <td align="right"><span style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">DAILY UPDATE</span></td>
      </tr>
    </table>
  </td></tr>

  <!-- Hero -->
  <tr><td class="mobile-pad" style="padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);border-radius:12px;">
      <tr><td style="padding:24px;">
        <div style="font-size:10px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">📰 Daily Media Update</div>
        <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">${totalCount} New Mention${totalCount !== 1 ? 's' : ''} for ${clientName}</h1>
        <p style="margin:0 0 4px;font-size:13px;color:#94a3b8;">${greeting} Here's your daily media update.</p>
        <p style="margin:0;font-size:12px;color:#64748b;">${formatDate()}</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Stats Bar -->
  <tr><td class="mobile-pad" style="padding:0 24px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f7f5;border-radius:12px;padding:4px;">
      <tr>${statCellsHtml}</tr>
    </table>
  </td></tr>

  <!-- Top Mentions Header -->
  <tr><td class="mobile-pad" style="padding:0 24px 10px;">
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Top Mentions</div>
  </td></tr>

  <!-- Media Cards -->
  <tr><td class="mobile-pad" style="padding:0 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">${mediaCardsHtml}</table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:24px;text-align:center;background:#fafaf9;border-top:1px solid #e2e8f0;">
    ${hasMore ? `<p style="margin:0 0 16px;font-size:13px;color:#64748b;">+ ${remainingCount} more items available</p>` : ''}
    <a href="${dashboardUrl}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;">View Full Dashboard</a>
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
