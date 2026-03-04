export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamically import to avoid client-side issues
    const { initializeDailyInsightsCron } = await import('@/lib/scrapers/daily-insights-cron')
    const { initializeNotificationCron } = await import('@/lib/notification-cron')
    
    // Initialize cron jobs
    initializeDailyInsightsCron()
    initializeNotificationCron()
  }
}
