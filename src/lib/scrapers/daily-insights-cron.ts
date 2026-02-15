import cron, { ScheduledTask } from 'node-cron'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export interface CronTaskConfig {
  schedule?: string
  enabled?: boolean
}

let scheduledTask: ScheduledTask | null = null

// Schedule the Daily Insights scraper to run automatically
// Cron patterns (minute hour day month weekday):
// '0 */6 * * *' = Every 6 hours
// '0 0 * * *' = Every day at midnight
// '0 12 * * *' = Every day at noon
// '0 6,12,18 * * *' = At 6am, noon, and 6pm daily
export function initializeDailyInsightsCron(config?: CronTaskConfig) {
  // Get schedule from config, environment, or use default
  const schedule = config?.schedule || 
                   process.env.DAILY_INSIGHTS_CRON_SCHEDULE || 
                   '0 */6 * * *' // Default: every 6 hours

  const enabled = config?.enabled !== false && 
                  (process.env.ENABLE_CRON === 'true' || 
                   process.env.NODE_ENV === 'production')

  if (!enabled) {
    console.log('[Daily Insights] Cron job disabled (enable with ENABLE_CRON=true)')
    return null
  }

  if (scheduledTask) {
    console.warn('[Daily Insights] Cron job already initialized, skipping...')
    return scheduledTask
  }

  const task = cron.schedule(schedule, async () => {
    console.log('[Daily Insights] Starting scheduled scraper run...')

    try {
      const scraperPath = path.resolve(process.cwd(), '..', '..', 'scrapy_crawler')

      const { stdout, stderr } = await execAsync(
        `cd "${scraperPath}" && python crawler_runner.py`,
        {
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          timeout: 5 * 60 * 1000, // 5 minute timeout
        }
      )

      console.log('[Daily Insights] Scraper completed successfully')

      // Parse output to count articles
      const articleCount = (stdout.match(/Article saved/g) || []).length
      if (articleCount > 0) {
        console.log(`[Daily Insights] Scraped ${articleCount} new articles`)
      }
    } catch (error) {
      console.error('[Daily Insights] Scraper failed:', error)
    }
  })

  task.start()
  scheduledTask = task

  console.log(`[Daily Insights] Cron job initialized with schedule: ${schedule}`)

  return task
}

// Stop the scheduled cron job
export function stopDailyInsightsCron() {
  if (scheduledTask) {
    scheduledTask.stop()
    scheduledTask = null
    console.log('[Daily Insights] Cron job stopped')
  }
}

// Check if cron job is running
export function isDailyInsightsCronRunning(): boolean {
  return scheduledTask !== null
}
