export async function register() {
  // Cron jobs are DISABLED by default to avoid Vercel usage limits
  // To enable, set ENABLE_CRON=true in your environment variables
  
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.ENABLE_CRON === 'true') {
    const { initializeDailyInsightsCron } = await import('@/lib/scrapers/daily-insights-cron')
    const { initializeNotificationCron } = await import('@/lib/notification-cron')
    
    initializeDailyInsightsCron()
    initializeNotificationCron()
  }
}
