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

  const mediaCardsHtml = items.map(item => `
    <tr>
      <td style="padding: 0 0 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <tr>
            ${item.imageUrl ? `
            <td width="120" style="vertical-align: top;">
              <div style="position: relative;">
                <img src="${item.imageUrl}" alt="" width="120" height="120" style="display: block; object-fit: cover;" />
                <span style="position: absolute; top: 8px; left: 8px; background: rgba(255,255,255,0.95); color: #f97316; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">${getMediaTypeLabel(item.type)}</span>
              </div>
            </td>
            ` : `
            <td width="120" style="vertical-align: top; background: #f1f5f9;">
              <div style="width: 120px; height: 120px; position: relative;">
                <span style="position: absolute; top: 8px; left: 8px; background: rgba(255,255,255,0.95); color: #f97316; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">${getMediaTypeLabel(item.type)}</span>
              </div>
            </td>
            `}
            <td style="vertical-align: top; padding: 16px;">
              <a href="${item.sourceUrl || dashboardUrl}" style="color: #0f172a; text-decoration: none; font-weight: 700; font-size: 15px; line-height: 1.4; display: block; margin-bottom: 8px;">
                ${item.title.length > 80 ? item.title.substring(0, 80) + '...' : item.title}
              </a>
              ${item.summary ? `<p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 12px 0;">${item.summary.substring(0, 120)}${item.summary.length > 120 ? '...' : ''}</p>` : ''}
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  ${item.publication ? `<td style="color: #94a3b8; font-size: 11px; padding-right: 12px;">📍 ${item.publication}</td>` : ''}
                  <td style="color: #94a3b8; font-size: 11px;">🕐 ${formatTimeAgo(item.date)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
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
</head>
<body style="margin: 0; padding: 0; background-color: #f8f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f7f5;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        
        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 0; max-width: 600px;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 24px 24px 16px 24px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <img src="${LOGO_URL}" alt="Ovaview" height="32" style="height: 32px; width: auto;" />
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">${formatDate()}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Title Card -->
          <tr>
            <td style="padding: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #fef3e7 0%, #fff7ed 100%); border: 1px solid #fed7aa; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px;">
                    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #0f172a;">Daily Media Update</h1>
                    <p style="margin: 0; font-size: 15px; color: #64748b;">${greeting} Here's your media update for <strong style="color: #0f172a;">${clientName}</strong></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Stats Bar -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <!-- Web -->
                  <td width="20%" align="center" style="padding: 4px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="background: #f8f7f5; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%;">
                      <tr>
                        <td align="center" style="padding: 12px 8px;">
                          <div style="font-size: 20px; margin-bottom: 4px;">🌐</div>
                          <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${counts.web}</div>
                          <div style="font-size: 9px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Web</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- TV -->
                  <td width="20%" align="center" style="padding: 4px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="background: #f8f7f5; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%;">
                      <tr>
                        <td align="center" style="padding: 12px 8px;">
                          <div style="font-size: 20px; margin-bottom: 4px;">📺</div>
                          <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${counts.tv}</div>
                          <div style="font-size: 9px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">TV</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Radio -->
                  <td width="20%" align="center" style="padding: 4px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="background: #f8f7f5; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%;">
                      <tr>
                        <td align="center" style="padding: 12px 8px;">
                          <div style="font-size: 20px; margin-bottom: 4px;">📻</div>
                          <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${counts.radio}</div>
                          <div style="font-size: 9px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Radio</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Print -->
                  <td width="20%" align="center" style="padding: 4px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="background: #f8f7f5; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%;">
                      <tr>
                        <td align="center" style="padding: 12px 8px;">
                          <div style="font-size: 20px; margin-bottom: 4px;">📰</div>
                          <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${counts.print}</div>
                          <div style="font-size: 9px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Print</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Social -->
                  <td width="20%" align="center" style="padding: 4px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="background: #f8f7f5; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%;">
                      <tr>
                        <td align="center" style="padding: 12px 8px;">
                          <div style="font-size: 20px; margin-bottom: 4px;">💬</div>
                          <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${counts.social}</div>
                          <div style="font-size: 9px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Social</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Top Mentions Header -->
          <tr>
            <td style="padding: 0 24px 16px 24px;">
              <span style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Top Mentions</span>
            </td>
          </tr>
          
          <!-- Media Cards -->
          <tr>
            <td style="padding: 0 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${mediaCardsHtml}
              </table>
            </td>
          </tr>
          
          ${hasMore ? `
          <!-- View More CTA -->
          <tr>
            <td style="padding: 24px; text-align: center; background: #fafaf9; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b;">+ ${remainingCount} more items available from today's scan</p>
              <a href="${dashboardUrl}" style="display: inline-block; background: #f97316; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 8px;">
                View All on Dashboard →
              </a>
            </td>
          </tr>
          ` : `
          <!-- Dashboard CTA -->
          <tr>
            <td style="padding: 24px; text-align: center; background: #fafaf9; border-top: 1px solid #e2e8f0;">
              <a href="${dashboardUrl}" style="display: inline-block; background: #f97316; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 8px;">
                View All on Dashboard →
              </a>
            </td>
          </tr>
          `}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 24px; text-align: center; background: #f8f7f5;">
              <p style="margin: 0 0 16px 0; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Powered by Ovaview Media Monitoring</p>
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #94a3b8;">
                <a href="${dashboardUrl}" style="color: #64748b; text-decoration: underline;">Contact Support</a>
                &nbsp;&nbsp;•&nbsp;&nbsp;
                <a href="${dashboardUrl}" style="color: #64748b; text-decoration: underline;">Manage Alerts</a>
                &nbsp;&nbsp;•&nbsp;&nbsp;
                <a href="${dashboardUrl}" style="color: #64748b; text-decoration: underline;">Unsubscribe</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">© ${new Date().getFullYear()} Ovaview. All rights reserved.</p>
            </td>
          </tr>
          
        </table>
        <!-- End Main Container -->
        
      </td>
    </tr>
  </table>
  <!-- End Wrapper -->
  
</body>
</html>
  `
}
