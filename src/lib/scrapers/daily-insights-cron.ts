import cron, { ScheduledTask } from 'node-cron'

const SCRAPER_API = process.env.NEXT_PUBLIC_SCRAPER_API || 'http://localhost:5000'

export interface CronTaskConfig {
  schedule?: string
  enabled?: boolean
}

let scheduledTask: ScheduledTask | null = null

// Schedule the Daily Insights scraper to run automatically
// Cron patterns (minute hour day month weekday):
// '0 */6 * * *' = Every 6 hours
// '0 0 * * *' = Every day at midnight
// '0 6,12,18 * * *' = At 6am, noon, and 6pm daily
export function initializeDailyInsightsCron(config?: CronTaskConfig) {
  const schedule = config?.schedule || 
                   process.env.DAILY_INSIGHTS_CRON_SCHEDULE || 
                   '0 */6 * * *'

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
      const res = await fetch(`${SCRAPER_API}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        throw new Error(`Scraper API returned ${res.status}`)
      }

      const data = await res.json()
      console.log(`[Daily Insights] Scraper completed: ${data.stats?.total_articles || 0} articles scraped`)
    } catch (error) {
      console.error('[Daily Insights] Scraper failed:', error)
    }
  })

  task.start()
  scheduledTask = task

  console.log(`[Daily Insights] Cron job initialized with schedule: ${schedule}`)
  return task
}

export function stopDailyInsightsCron() {
  if (scheduledTask) {
    scheduledTask.stop()
    scheduledTask = null
    console.log('[Daily Insights] Cron job stopped')
  }
}

export function isDailyInsightsCronRunning(): boolean {
  return scheduledTask !== null
}
