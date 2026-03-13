/**
 * Calculates the daily probable reach for an article based on its publication's monthly reach.
 * 
 * Logic: monthlyReach / daysInMonth(articleDate)
 * 
 * This gives a fair daily distribution — each article published on a given day
 * gets the proportional daily share of the publication's monthly audience.
 */

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/**
 * Given a publication's monthly reach and the article's publish date,
 * returns the estimated daily reach for that article.
 */
export function calculateDailyReach(monthlyReach: number, articleDate: Date | string): number {
  if (!monthlyReach || monthlyReach <= 0) return 0
  const date = typeof articleDate === 'string' ? new Date(articleDate) : articleDate
  const days = getDaysInMonth(date)
  return Math.round(monthlyReach / days)
}
