import cron, { ScheduledTask } from 'node-cron'
import { processScheduledNotifications } from '@/lib/notification-service'

let scheduledTask: ScheduledTask | null = null

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

  // Run every 5 minutes instead of every minute to reduce load
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

  console.log('[Notifications] Cron initialized - checking every 5 minutes')
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
