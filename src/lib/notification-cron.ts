import cron, { ScheduledTask } from 'node-cron'
import { processScheduledNotifications } from '@/lib/notification-service'

let scheduledTask: ScheduledTask | null = null

// Schedule notification processing to run every minute
// This checks all client notification times and sends emails when due
export function initializeNotificationCron() {
  const enabled = process.env.ENABLE_NOTIFICATION_CRON === 'true' || 
                  process.env.NODE_ENV === 'production'

  if (!enabled) {
    console.log('[Notifications] Cron job disabled (enable with ENABLE_NOTIFICATION_CRON=true)')
    return null
  }

  if (scheduledTask) {
    console.warn('[Notifications] Cron job already initialized, skipping...')
    return scheduledTask
  }

  // Run every minute to check for notifications due
  const task = cron.schedule('* * * * *', async () => {
    try {
      const result = await processScheduledNotifications()
      
      if (result.processed > 0) {
        console.log(`[Notifications] Processed ${result.processed} notifications, sent ${result.sent} emails`)
        if (result.errors.length > 0) {
          console.error('[Notifications] Errors:', result.errors)
        }
      }
    } catch (error) {
      console.error('[Notifications] Cron job failed:', error)
    }
  })

  task.start()
  scheduledTask = task

  console.log('[Notifications] Cron job initialized - checking every minute')
  return task
}

export function stopNotificationCron() {
  if (scheduledTask) {
    scheduledTask.stop()
    scheduledTask = null
    console.log('[Notifications] Cron job stopped')
  }
}

export function isNotificationCronRunning(): boolean {
  return scheduledTask !== null
}
