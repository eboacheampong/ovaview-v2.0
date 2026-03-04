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
      subject: `📰 Daily Media Update for ${clientName} - ${mediaItems.length} new ${mediaItems.length === 1 ? 'item' : 'items'}`,
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
  const { clientName, recipientName, items, counts, hasMore, remainingCount, dashboardUrl } = data
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,'

  // Use internalUrl (our app) for post links, fallback to dashboardUrl
  const getItemLink = (item: MediaItem) => item.internalUrl || item.sourceUrl || dashboardUrl

  const mediaCardsHtml = items.map(item => `
    <tr>
      <td style="padding: 0 0 14px 0;">
        <a href="${getItemLink(item)}" style="text-decoration: none; display: block;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <tr>
              ${item.imageUrl ? `
              <td class="card-image" width="100" style="vertical-align: top; width: 100px; min-width: 100px;">
                <img src="${item.imageUrl}" alt="" width="100" style="display: block; width: 100px; height: 100px; object-fit: cover;" />
              </td>
              ` : `
              <td class="card-image" width="100" style="vertical-align: top; background: #f1f5f9; width: 100px; min-width: 100px; height: 100px;">
              </td>
              `}
              <td class="card-text" style="vertical-align: top; padding: 12px 14px;">
                <div style="margin-bottom: 4px;">
                  <span style="background: #fff7ed; color: #f97316; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; border: 1px solid #fed7aa;">${getMediaTypeLabel(item.type)}</span>
                </div>
                <div class="card-title" style="color: #0f172a; font-weight: 700; font-size: 14px; line-height: 1.3; margin-bottom: 6px;">
                  ${item.title.length > 80 ? item.title.substring(0, 80) + '...' : item.title}
                </div>
                ${item.summary ? `<div class="card-summary" style="color: #64748b; font-size: 12px; line-height: 1.4; margin-bottom: 8px;">${item.summary.substring(0, 100)}${item.summary.length > 100 ? '...' : ''}</div>` : ''}
                <div style="color: #94a3b8; font-size: 11px;">
                  ${item.publication ? `${item.publication} &middot; ` : ''}${formatTimeAgo(item.date)}
                </div>
              </td>
            </tr>
          </table>
        </a>
      </td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Daily Media Update</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .mobile-pad { padding-left: 14px !important; padding-right: 14px !important; }
      .stats-row td { display: inline-block !important; width: 30% !important; margin-bottom: 6px !important; }
      .card-image { width: 80px !important; min-width: 80px !important; }
      .card-image img { width: 80px !important; height: 80px !important; }
      .card-text { padding: 10px 10px !important; }
      .card-title { font-size: 13px !important; }
      .card-summary { display: none !important; }
      .hero-title { font-size: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f7f5;">
    <tr>
      <td align="center" style="padding: 24px 10px;">
        
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td class="mobile-pad" style="padding: 20px 24px 14px 24px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td><img src="${LOGO_URL}" alt="Ovaview" height="28" style="height: 28px; width: auto;" /></td>
                  <td align="right"><span style="font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">${formatDate()}</span></td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Title Card -->
          <tr>
            <td class="mobile-pad" style="padding: 20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <h1 class="hero-title" style="margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: #0f172a;">Daily Media Update</h1>
                    <p style="margin: 0; font-size: 14px; color: #64748b;">${greeting} Here's your media update for <strong style="color: #0f172a;">${clientName}</strong></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Stats Bar -->
          <tr>
            <td class="mobile-pad" style="padding: 0 24px 20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr class="stats-row">
                  <td width="20%" align="center" style="padding: 3px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="background: #f8f7f5; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%;"><tr><td align="center" style="padding: 10px 6px;">
                      <div style="font-size: 18px; margin-bottom: 2px;">🌐</div>
                      <div style="font-size: 16px; font-weight: 700; color: #0f172a;">${counts.web}</div>
                      <div style="font-size: 9px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Web</div>
                    </td></tr></table>
                  </td>
                  <td width="20%" align="center" style="padding: 3px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="background: #f8f7f5; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%;"><tr><td align="center" style="padding: 10px 6px;">
                      <div style="font-size: 18px; margin-bottom: 2px;">📺</div>
                      <div style="font-size: 16px; font-weight: 700; color: #0f172a;">${counts.tv}</div>
                      <div style="font-size: 9px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">TV</div>
                    </td></tr></table>
                  </td>
                  <td width="20%" align="center" style="padding: 3px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="background: #f8f7f5; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%;"><tr><td align="center" style="padding: 10px 6px;">
                      <div style="font-size: 18px; margin-bottom: 2px;">📻</div>
                      <div style="font-size: 16px; font-weight: 700; color: #0f172a;">${counts.radio}</div>
                      <div style="font-size: 9px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Radio</div>
                    </td></tr></table>
                  </td>
                  <td width="20%" align="center" style="padding: 3px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="background: #f8f7f5; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%;"><tr><td align="center" style="padding: 10px 6px;">
                      <div style="font-size: 18px; margin-bottom: 2px;">📰</div>
                      <div style="font-size: 16px; font-weight: 700; color: #0f172a;">${counts.print}</div>
                      <div style="font-size: 9px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Print</div>
                    </td></tr></table>
                  </td>
                  <td width="20%" align="center" style="padding: 3px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="background: #f8f7f5; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%;"><tr><td align="center" style="padding: 10px 6px;">
                      <div style="font-size: 18px; margin-bottom: 2px;">💬</div>
                      <div style="font-size: 16px; font-weight: 700; color: #0f172a;">${counts.social}</div>
                      <div style="font-size: 9px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Social</div>
                    </td></tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Top Mentions Header -->
          <tr>
            <td class="mobile-pad" style="padding: 0 24px 12px 24px;">
              <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Top Mentions</span>
            </td>
          </tr>
          
          <!-- Media Cards -->
          <tr>
            <td class="mobile-pad" style="padding: 0 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${mediaCardsHtml}
              </table>
            </td>
          </tr>
          
          ${hasMore ? `
          <tr>
            <td style="padding: 24px; text-align: center; background: #fafaf9; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b;">+ ${remainingCount} more items available</p>
              <a href="${dashboardUrl}" style="display: inline-block; background: #f97316; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 8px;">View All on Dashboard</a>
            </td>
          </tr>
          ` : `
          <tr>
            <td style="padding: 24px; text-align: center; background: #fafaf9; border-top: 1px solid #e2e8f0;">
              <a href="${dashboardUrl}" style="display: inline-block; background: #f97316; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 8px;">View All on Dashboard</a>
            </td>
          </tr>
          `}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 28px 24px; text-align: center; background: #f8f7f5;">
              <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Powered by Ovaview Media Monitoring</p>
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #94a3b8;">
                <a href="${dashboardUrl}" style="color: #64748b; text-decoration: underline;">Dashboard</a>
                &nbsp;&middot;&nbsp;
                <a href="${dashboardUrl}" style="color: #64748b; text-decoration: underline;">Manage Alerts</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">&copy; ${new Date().getFullYear()} Ovaview. All rights reserved.</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}
