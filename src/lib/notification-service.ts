import { prisma } from '@/lib/prisma'
import { sendNotificationEmail, MediaItem } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface ClientNotificationData {
  settingId: string
  clientId: string
  clientName: string
  clientEmail: string | null
  lastSentAt: Date | null
  users: { id: string; name: string; email: string }[]
}

// Get all media items for a client since last notification
async function getMediaItemsSinceLastNotification(
  clientId: string,
  lastSentAt: Date | null
): Promise<MediaItem[]> {
  const since = lastSentAt || new Date(Date.now() - 24 * 60 * 60 * 1000) // Default to 24 hours ago
  
  // Get client's industries and keywords for filtering
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      industries: { select: { industryId: true } },
      keywords: { include: { keyword: true } },
    },
  })

  if (!client) return []

  const industryIds = client.industries.map(i => i.industryId)
  const keywordNames = client.keywords.map(k => k.keyword.name.toLowerCase())

  const mediaItems: MediaItem[] = []

  // Fetch web stories
  const webStories = await prisma.webStory.findMany({
    where: {
      createdAt: { gte: since },
      OR: [
        { industryId: { in: industryIds.length > 0 ? industryIds : undefined } },
        ...(keywordNames.length > 0 ? keywordNames.map(kw => ({
          OR: [
            { title: { contains: kw, mode: 'insensitive' as const } },
            { content: { contains: kw, mode: 'insensitive' as const } },
            { keywords: { contains: kw, mode: 'insensitive' as const } },
          ]
        })) : []),
      ].filter(Boolean),
    },
    include: {
      publication: { select: { name: true } },
      images: { take: 1 },
    },
    orderBy: { date: 'desc' },
  })

  for (const story of webStories) {
    mediaItems.push({
      id: story.id,
      title: story.title,
      summary: story.summary,
      date: story.date,
      type: 'web',
      sourceUrl: story.sourceUrl,
      imageUrl: story.images[0]?.url || null,
      publication: story.publication?.name,
    })
  }

  // Fetch TV stories
  const tvStories = await prisma.tVStory.findMany({
    where: {
      createdAt: { gte: since },
      OR: [
        { industryId: { in: industryIds.length > 0 ? industryIds : undefined } },
        ...(keywordNames.length > 0 ? keywordNames.map(kw => ({
          OR: [
            { title: { contains: kw, mode: 'insensitive' as const } },
            { content: { contains: kw, mode: 'insensitive' as const } },
            { keywords: { contains: kw, mode: 'insensitive' as const } },
          ]
        })) : []),
      ].filter(Boolean),
    },
    include: { station: { select: { name: true } } },
    orderBy: { date: 'desc' },
  })

  for (const story of tvStories) {
    mediaItems.push({
      id: story.id,
      title: story.title,
      summary: story.summary,
      date: story.date,
      type: 'tv',
      sourceUrl: story.videoUrl,
      imageUrl: null,
      publication: story.station?.name,
    })
  }

  // Fetch Radio stories
  const radioStories = await prisma.radioStory.findMany({
    where: {
      createdAt: { gte: since },
      OR: [
        { industryId: { in: industryIds.length > 0 ? industryIds : undefined } },
        ...(keywordNames.length > 0 ? keywordNames.map(kw => ({
          OR: [
            { title: { contains: kw, mode: 'insensitive' as const } },
            { content: { contains: kw, mode: 'insensitive' as const } },
            { keywords: { contains: kw, mode: 'insensitive' as const } },
          ]
        })) : []),
      ].filter(Boolean),
    },
    include: { station: { select: { name: true } } },
    orderBy: { date: 'desc' },
  })

  for (const story of radioStories) {
    mediaItems.push({
      id: story.id,
      title: story.title,
      summary: story.summary,
      date: story.date,
      type: 'radio',
      sourceUrl: story.audioUrl,
      imageUrl: null,
      publication: story.station?.name,
    })
  }

  // Fetch Print stories
  const printStories = await prisma.printStory.findMany({
    where: {
      createdAt: { gte: since },
      OR: [
        { industryId: { in: industryIds.length > 0 ? industryIds : undefined } },
        ...(keywordNames.length > 0 ? keywordNames.map(kw => ({
          OR: [
            { title: { contains: kw, mode: 'insensitive' as const } },
            { content: { contains: kw, mode: 'insensitive' as const } },
            { keywords: { contains: kw, mode: 'insensitive' as const } },
          ]
        })) : []),
      ].filter(Boolean),
    },
    include: {
      publication: { select: { name: true } },
      images: { take: 1 },
    },
    orderBy: { date: 'desc' },
  })

  for (const story of printStories) {
    mediaItems.push({
      id: story.id,
      title: story.title,
      summary: story.summary,
      date: story.date,
      type: 'print',
      sourceUrl: null,
      imageUrl: story.images[0]?.url || null,
      publication: story.publication?.name,
    })
  }

  // Fetch Social posts
  const socialPosts = await prisma.socialPost.findMany({
    where: {
      createdAt: { gte: since },
      clientId: clientId, // Social posts are directly linked to clients
    },
    include: { account: { select: { handle: true, platform: true } } },
    orderBy: { postedAt: 'desc' },
  })

  for (const post of socialPosts) {
    mediaItems.push({
      id: post.id,
      title: post.content?.substring(0, 100) || 'Social Media Post',
      summary: post.content,
      date: post.postedAt,
      type: 'social',
      sourceUrl: post.postUrl,
      imageUrl: post.mediaUrls?.[0] || null,
      publication: post.account ? `@${post.account.handle}` : post.authorHandle,
    })
  }

  // Sort all items by date descending
  mediaItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return mediaItems
}

// Send notification for a single client
export async function sendClientNotification(settingId: string): Promise<{
  success: boolean
  emailsSent: number
  itemsCount: number
  error?: string
}> {
  try {
    const setting = await prisma.clientNotificationSetting.findUnique({
      where: { id: settingId },
      include: {
        client: {
          include: {
            users: {
              where: { isActive: true, role: 'CLIENT_USER' },
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    })

    if (!setting) {
      return { success: false, emailsSent: 0, itemsCount: 0, error: 'Setting not found' }
    }

    if (!setting.emailEnabled) {
      return { success: false, emailsSent: 0, itemsCount: 0, error: 'Email notifications disabled' }
    }

    // Get media items since last notification
    const mediaItems = await getMediaItemsSinceLastNotification(
      setting.clientId,
      setting.lastSentAt
    )

    if (mediaItems.length === 0) {
      // Update lastSentAt even if no items (to prevent re-checking same period)
      await prisma.clientNotificationSetting.update({
        where: { id: settingId },
        data: { lastSentAt: new Date() },
      })
      return { success: true, emailsSent: 0, itemsCount: 0 }
    }

    const dashboardUrl = `${APP_URL}/client-portal`
    const recipients: { email: string; name?: string }[] = []

    // Add client email if exists
    if (setting.client.email) {
      recipients.push({ email: setting.client.email, name: setting.client.name })
    }

    // Add all client users
    for (const user of setting.client.users) {
      if (user.email && !recipients.some(r => r.email === user.email)) {
        recipients.push({ email: user.email, name: user.name })
      }
    }

    if (recipients.length === 0) {
      return { success: false, emailsSent: 0, itemsCount: mediaItems.length, error: 'No recipients found' }
    }

    // Send emails to all recipients
    let emailsSent = 0
    for (const recipient of recipients) {
      try {
        await sendNotificationEmail({
          clientName: setting.client.name,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          mediaItems,
          dashboardUrl,
        })
        emailsSent++
      } catch (err) {
        console.error(`Failed to send email to ${recipient.email}:`, err)
      }
    }

    // Update lastSentAt
    await prisma.clientNotificationSetting.update({
      where: { id: settingId },
      data: { lastSentAt: new Date() },
    })

    // Log the email send
    await prisma.emailLog.create({
      data: {
        recipient: recipients.map(r => r.email).join(', '),
        subject: `Daily Media Update for ${setting.client.name}`,
        status: emailsSent > 0 ? 'sent' : 'failed',
        errorMessage: emailsSent === 0 ? 'No emails sent' : null,
      },
    })

    return { success: true, emailsSent, itemsCount: mediaItems.length }
  } catch (error) {
    console.error('Failed to send client notification:', error)
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
  const settings = await prisma.clientNotificationSetting.findMany({
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

    // Convert notification time to UTC based on timezone
    const notificationTimeUTC = convertToUTC(setting.notificationTime, setting.timezone)
    
    // Check if it's time to send (within 5 minute window)
    if (isWithinTimeWindow(currentTime, notificationTimeUTC, 5)) {
      // Check if already sent today
      if (setting.lastSentAt) {
        const lastSentDate = new Date(setting.lastSentAt)
        const today = new Date()
        if (
          lastSentDate.getUTCFullYear() === today.getUTCFullYear() &&
          lastSentDate.getUTCMonth() === today.getUTCMonth() &&
          lastSentDate.getUTCDate() === today.getUTCDate()
        ) {
          continue // Already sent today
        }
      }

      results.processed++
      const result = await sendClientNotification(setting.id)
      
      if (result.success && result.emailsSent > 0) {
        results.sent++
      } else if (result.error) {
        results.errors.push(`${setting.client.name}: ${result.error}`)
      }
    }
  }

  return results
}

// Convert local time to UTC
function convertToUTC(time: string, timezone: string): string {
  // Simple timezone offset mapping
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
