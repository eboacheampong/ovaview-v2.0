import cron, { ScheduledTask } from 'node-cron'
import { processScheduledNotifications } from '@/lib/notification-service'

let scheduledTask: ScheduledTask | null = null
let weeklyTask: ScheduledTask | null = null
let monthlyTask: ScheduledTask | null = null

// Schedule notification processing
// DISABLED by default - only runs if ENABLE_NOTIFICATION_CRON=true
export function initializeNotificationCron() {
  // Must explicitly enable - no auto-enable in production
  const enabled = process.env.ENABLE_NOTIFICATION_CRON === 'true'

  if (!enabled) {
    console.log('[Notifications] Cron disabled (set ENABLE_NOTIFICATION_CRON=true to enable)')
    return null
  }

  if (scheduledTask) {
    console.warn('[Notifications] Cron already initialized, skipping...')
    return scheduledTask
  }

  // Daily notifications - every 5 minutes
  const task = cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await processScheduledNotifications()
      
      if (result.processed > 0) {
        console.log(`[Notifications] Processed ${result.processed}, sent ${result.sent}`)
        if (result.errors.length > 0) {
          console.error('[Notifications] Errors:', result.errors)
        }
      }
    } catch (error) {
      console.error('[Notifications] Cron failed:', error)
    }
  })

  task.start()
  scheduledTask = task
  console.log('[Notifications] Daily cron initialized - checking every 5 minutes')

  // Weekly reports - Sunday at 6 PM UTC
  // Calls the weekly-reports API endpoint internally
  const weeklyJob = cron.schedule('0 18 * * 0', async () => {
    try {
      console.log('[Notifications] Running weekly reports cron...')
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/cron/weekly-reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
        },
      })
      const data = await res.json()
      console.log('[Notifications] Weekly reports result:', data)
    } catch (error) {
      console.error('[Notifications] Weekly reports cron failed:', error)
    }
  })

  weeklyJob.start()
  weeklyTask = weeklyJob
  console.log('[Notifications] Weekly reports cron initialized - Sundays at 6 PM UTC')

  // Monthly reports - 1st of each month at 6 PM UTC
  const monthlyJob = cron.schedule('0 18 1 * *', async () => {
    try {
      console.log('[Notifications] Running monthly reports cron...')
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/cron/monthly-reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
        },
      })
      const data = await res.json()
      console.log('[Notifications] Monthly reports result:', data)
    } catch (error) {
      console.error('[Notifications] Monthly reports cron failed:', error)
    }
  })

  monthlyJob.start()
  monthlyTask = monthlyJob
  console.log('[Notifications] Monthly reports cron initialized - 1st of month at 6 PM UTC')

  return task
}

export function stopNotificationCron() {
  if (scheduledTask) {
    scheduledTask.stop()
    scheduledTask = null
  }
  if (weeklyTask) {
    weeklyTask.stop()
    weeklyTask = null
  }
  if (monthlyTask) {
    monthlyTask.stop()
    monthlyTask = null
  }
  console.log('[Notifications] All cron jobs stopped')
}

export function isNotificationCronRunning(): boolean {
  return scheduledTask !== null
}
