import { prisma } from '@/lib/prisma'
import { sendNotificationEmail, MediaItem } from '@/lib/email'
import { cacheSentReport } from '@/lib/sent-report-cache'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Use type assertion to work around stale TypeScript cache
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

export type SendMode = 'since_last' | 'last_24h'

// Get all media items for a client based on mode
async function getMediaItemsForClient(
  clientId: string,
  lastSentAt: Date | null,
  mode: SendMode = 'since_last'
): Promise<MediaItem[]> {
  // Determine the "since" date based on mode
  let since: Date
  if (mode === 'last_24h') {
    since = new Date(Date.now() - 24 * 60 * 60 * 1000) // Always last 24 hours
  } else {
    since = lastSentAt || new Date(Date.now() - 24 * 60 * 60 * 1000) // Since last sent or 24h
  }
  
  // Get client's industries and keywords for filtering
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      industries: { select: { industryId: true } },
      keywords: { include: { keyword: true } },
    },
  })

  if (!client) return []

  const industryIds = client.industries.map((i: { industryId: string }) => i.industryId)
  const keywordNames = client.keywords.map((k: { keyword: { name: string } }) => k.keyword.name.toLowerCase())

  const mediaItems: MediaItem[] = []

  // Build filter conditions
  const hasIndustries = industryIds.length > 0
  const hasKeywords = keywordNames.length > 0

  // Fetch web stories
  const webStories = await prisma.webStory.findMany({
    where: {
      createdAt: { gte: since },
      ...(hasIndustries || hasKeywords ? {
        OR: [
          ...(hasIndustries ? [{ industryId: { in: industryIds } }] : []),
          ...(hasKeywords ? keywordNames.flatMap((kw: string) => [
            { title: { contains: kw, mode: 'insensitive' as const } },
            { keywords: { contains: kw, mode: 'insensitive' as const } },
          ]) : []),
        ],
      } : {}),
    },
    include: {
      publication: { select: { name: true } },
      images: { take: 1 },
    },
    orderBy: { date: 'desc' },
    take: 50,
  })

  for (const story of webStories) {
    mediaItems.push({
      id: story.id,
      title: story.title,
      summary: story.summary,
      date: story.date,
      type: 'web',
      sourceUrl: story.sourceUrl,
      internalUrl: `${APP_URL}/media/web/${story.slug}`,
      imageUrl: story.images[0]?.url || null,
      publication: story.publication?.name,
      sentiment: story.overallSentiment,
    })
  }

  // Fetch TV stories
  const tvStories = await prisma.tVStory.findMany({
    where: {
      createdAt: { gte: since },
      ...(hasIndustries || hasKeywords ? {
        OR: [
          ...(hasIndustries ? [{ industryId: { in: industryIds } }] : []),
          ...(hasKeywords ? keywordNames.flatMap((kw: string) => [
            { title: { contains: kw, mode: 'insensitive' as const } },
            { keywords: { contains: kw, mode: 'insensitive' as const } },
          ]) : []),
        ],
      } : {}),
    },
    include: { station: { select: { name: true } } },
    orderBy: { date: 'desc' },
    take: 50,
  })

  for (const story of tvStories) {
    mediaItems.push({
      id: story.id,
      title: story.title,
      summary: story.summary,
      date: story.date,
      type: 'tv',
      sourceUrl: story.videoUrl,
      internalUrl: `${APP_URL}/media/tv/${story.slug}`,
      imageUrl: null,
      publication: story.station?.name,
      sentiment: story.overallSentiment,
    })
  }

  // Fetch Radio stories
  const radioStories = await prisma.radioStory.findMany({
    where: {
      createdAt: { gte: since },
      ...(hasIndustries || hasKeywords ? {
        OR: [
          ...(hasIndustries ? [{ industryId: { in: industryIds } }] : []),
          ...(hasKeywords ? keywordNames.flatMap((kw: string) => [
            { title: { contains: kw, mode: 'insensitive' as const } },
            { keywords: { contains: kw, mode: 'insensitive' as const } },
          ]) : []),
        ],
      } : {}),
    },
    include: { station: { select: { name: true } } },
    orderBy: { date: 'desc' },
    take: 50,
  })

  for (const story of radioStories) {
    mediaItems.push({
      id: story.id,
      title: story.title,
      summary: story.summary,
      date: story.date,
      type: 'radio',
      sourceUrl: story.audioUrl,
      internalUrl: `${APP_URL}/media/radio/${story.slug}`,
      imageUrl: null,
      publication: story.station?.name,
      sentiment: story.overallSentiment,
    })
  }

  // Fetch Print stories
  const printStories = await prisma.printStory.findMany({
    where: {
      createdAt: { gte: since },
      ...(hasIndustries || hasKeywords ? {
        OR: [
          ...(hasIndustries ? [{ industryId: { in: industryIds } }] : []),
          ...(hasKeywords ? keywordNames.flatMap((kw: string) => [
            { title: { contains: kw, mode: 'insensitive' as const } },
            { keywords: { contains: kw, mode: 'insensitive' as const } },
          ]) : []),
        ],
      } : {}),
    },
    include: {
      publication: { select: { name: true } },
      images: { take: 1 },
    },
    orderBy: { date: 'desc' },
    take: 50,
  })

  for (const story of printStories) {
    mediaItems.push({
      id: story.id,
      title: story.title,
      summary: story.summary,
      date: story.date,
      type: 'print',
      sourceUrl: null,
      internalUrl: `${APP_URL}/media/print/${story.slug}`,
      imageUrl: story.images[0]?.url || null,
      publication: story.publication?.name,
      sentiment: story.overallSentiment,
    })
  }

  // Fetch Social posts - filter by client or by industry/keywords
  const socialPosts = await db.socialPost.findMany({
    where: {
      createdAt: { gte: since },
      OR: [
        { clientId: clientId },
        ...(hasIndustries ? [{ industryId: { in: industryIds } }] : []),
        ...(hasKeywords ? keywordNames.flatMap((kw: string) => [
          { content: { contains: kw, mode: 'insensitive' } },
          { keywords: { contains: kw, mode: 'insensitive' } },
        ]) : []),
      ],
    },
    include: { account: { select: { handle: true, platform: true } } },
    orderBy: { postedAt: 'desc' },
    take: 50,
  })

  for (const post of socialPosts) {
    mediaItems.push({
      id: post.id,
      title: post.content?.substring(0, 100) || 'Social Media Post',
      summary: post.content,
      date: post.postedAt,
      type: 'social',
      sourceUrl: post.postUrl,
      internalUrl: `${APP_URL}/media/social/${post.id}`,
      imageUrl: post.mediaUrls?.[0] || null,
      publication: post.account ? `@${post.account.handle}` : post.authorHandle,
      sentiment: post.overallSentiment,
    })
  }

  // Sort all items by date descending
  mediaItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return mediaItems
}


// Send notification for a single client
export async function sendClientNotification(
  settingId: string,
  mode: SendMode = 'since_last'
): Promise<{
  success: boolean
  emailsSent: number
  itemsCount: number
  error?: string
}> {
  try {
    console.log('[Notification] Fetching setting:', settingId, 'mode:', mode)
    
    const setting = await db.clientNotificationSetting.findUnique({
      where: { id: settingId },
      include: {
        client: {
          include: {
            users: {
              where: { isActive: true },
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    })

    if (!setting) {
      console.log('[Notification] Setting not found')
      return { success: false, emailsSent: 0, itemsCount: 0, error: 'Setting not found' }
    }

    console.log('[Notification] Client:', setting.client.name, 'Email enabled:', setting.emailEnabled)
    console.log('[Notification] Client email:', setting.client.email)
    console.log('[Notification] Client users found:', setting.client.users.length, setting.client.users.map((u: { email: string; role: string }) => `${u.email} (${u.role})`))

    if (!setting.emailEnabled) {
      return { success: false, emailsSent: 0, itemsCount: 0, error: 'Email notifications disabled' }
    }

    // Get media items based on mode
    console.log('[Notification] Fetching media items, mode:', mode, 'lastSentAt:', setting.lastSentAt)
    const mediaItems = await getMediaItemsForClient(
      setting.clientId,
      setting.lastSentAt,
      mode
    )
    console.log('[Notification] Found media items:', mediaItems.length)

    if (mediaItems.length === 0) {
      // Update lastSentAt even if no items (to prevent re-checking same period)
      await db.clientNotificationSetting.update({
        where: { id: settingId },
        data: { lastSentAt: new Date() },
      })
      return { success: true, emailsSent: 0, itemsCount: 0 }
    }

    const dashboardUrl = APP_URL
    const recipients: { email: string; name?: string }[] = []

    // Add client email if exists
    if (setting.client.email) {
      recipients.push({ email: setting.client.email, name: setting.client.name })
    }

    // Add all active users linked to this client
    for (const user of setting.client.users) {
      if (user.email && !recipients.some((r: { email: string }) => r.email === user.email)) {
        recipients.push({ email: user.email, name: user.name })
      }
    }

    console.log('[Notification] Total recipients:', recipients.length)
    console.log('[Notification] Recipient list:', JSON.stringify(recipients))

    if (recipients.length === 0) {
      return { success: false, emailsSent: 0, itemsCount: mediaItems.length, error: 'No recipients found - client has no email and no active users with emails' }
    }

    // Send one email per recipient (Resend free tier only allows single recipient per call)
    let emailsSent = 0
    const failedRecipients: string[] = []
    
    for (const recipient of recipients) {
      try {
        console.log('[Notification] Sending to:', recipient.email)
        await sendNotificationEmail({
          clientName: setting.client.name,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          mediaItems,
          dashboardUrl,
        })
        emailsSent++
        console.log('[Notification] Sent successfully to:', recipient.email)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error(`[Notification] Failed to send to ${recipient.email}:`, errorMsg)
        failedRecipients.push(`${recipient.email}: ${errorMsg}`)
      }
    }

    // Update lastSentAt
    await db.clientNotificationSetting.update({
      where: { id: settingId },
      data: { lastSentAt: new Date() },
    })

    // Log the email send
    await prisma.emailLog.create({
      data: {
        recipient: recipients.map((r: { email: string }) => r.email).join(', '),
        subject: `Daily Media Update for ${setting.client.name}`,
        status: emailsSent > 0 ? 'sent' : 'failed',
        errorMessage: failedRecipients.length > 0 ? `Failed: ${failedRecipients.join('; ')}` : null,
      },
    })

    // Cache the sent report for resend
    if (emailsSent > 0) {
      await cacheSentReport({
        clientId: setting.clientId,
        clientName: setting.client.name,
        reportType: 'daily',
        subject: `Daily Media Update for ${setting.client.name}`,
        recipients: recipients.map((r: { email: string }) => r.email),
        reportData: { mediaItems },
        emailsSent,
      }).catch(err => console.error('[Notification] Failed to cache sent report:', err))
    }

    if (emailsSent === 0 && failedRecipients.length > 0) {
      return { 
        success: false, 
        emailsSent: 0, 
        itemsCount: mediaItems.length, 
        error: `All emails failed: ${failedRecipients.join('; ')}` 
      }
    }

    return { 
      success: true, 
      emailsSent, 
      itemsCount: mediaItems.length,
      ...(failedRecipients.length > 0 ? { error: `Partial failure - ${failedRecipients.length} failed: ${failedRecipients.join('; ')}` } : {}),
    }
  } catch (error) {
    console.error('[Notification] Failed to send client notification:', error)
    return { success: false, emailsSent: 0, itemsCount: 0, error: String(error) }
  }
}

// Check and send notifications for all clients whose time has come
export async function processScheduledNotifications(): Promise<{
  processed: number
  sent: number
  errors: string[]
}> {
  const now = new Date()
  const currentHour = now.getUTCHours().toString().padStart(2, '0')
  const currentMinute = now.getUTCMinutes().toString().padStart(2, '0')
  const currentTime = `${currentHour}:${currentMinute}`

  // Get all active notification settings
  const settings = await db.clientNotificationSetting.findMany({
    where: {
      isActive: true,
      emailEnabled: true,
    },
    include: {
      client: { select: { id: true, name: true, isActive: true } },
    },
  })

  const results = { processed: 0, sent: 0, errors: [] as string[] }

  for (const setting of settings) {
    // Skip if client is not active
    if (!setting.client.isActive) continue

    // Parse multiple notification times (comma-separated)
    const notificationTimes = (setting.notificationTime || '').split(',').map((t: string) => t.trim()).filter(Boolean)

    // Check each configured time
    for (const time of notificationTimes) {
      const notificationTimeUTC = convertToUTC(time, setting.timezone)
      
      if (isWithinTimeWindow(currentTime, notificationTimeUTC, 5)) {
        // Check if already sent within the last 30 minutes (to avoid duplicate sends for same time slot)
        if (setting.lastSentAt) {
          const lastSentDate = new Date(setting.lastSentAt)
          const minutesSinceLastSent = (now.getTime() - lastSentDate.getTime()) / (1000 * 60)
          if (minutesSinceLastSent < 30) {
            continue // Already sent recently
          }
        }

        results.processed++
        const result = await sendClientNotification(setting.id)
        
        if (result.success && result.emailsSent > 0) {
          results.sent++
        } else if (result.error) {
          results.errors.push(`${setting.client.name}: ${result.error}`)
        }
        break // Only send once per check cycle even if multiple times match
      }
    }
  }

  return results
}

// Convert local time to UTC
function convertToUTC(time: string, timezone: string): string {
  const offsets: Record<string, number> = {
    'GMT': 0,
    'UTC': 0,
    'Africa/Harare': 2,
    'Africa/Johannesburg': 2,
    'Africa/Lagos': 1,
    'Africa/Nairobi': 3,
  }

  const offset = offsets[timezone] || 0
  const [hours, minutes] = time.split(':').map(Number)
  
  let utcHours = hours - offset
  if (utcHours < 0) utcHours += 24
  if (utcHours >= 24) utcHours -= 24

  return `${utcHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

// Check if current time is within window of target time
function isWithinTimeWindow(current: string, target: string, windowMinutes: number): boolean {
  const [currentH, currentM] = current.split(':').map(Number)
  const [targetH, targetM] = target.split(':').map(Number)
  
  const currentTotal = currentH * 60 + currentM
  const targetTotal = targetH * 60 + targetM
  
  const diff = Math.abs(currentTotal - targetTotal)
  return diff <= windowMinutes || diff >= (24 * 60 - windowMinutes)
}
