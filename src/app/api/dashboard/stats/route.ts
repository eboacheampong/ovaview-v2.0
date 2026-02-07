import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Fetch all counts in parallel
    const [
      webCount,
      printCount,
      radioCount,
      tvCount,
      activeClientsCount,
      todayWebCount,
      todayPrintCount,
      todayRadioCount,
      todayTvCount,
    ] = await Promise.all([
      // Total counts
      prisma.webStory.count(),
      prisma.printStory.count(),
      prisma.radioStory.count(),
      prisma.tVStory.count(),
      // Active clients
      prisma.client.count({ where: { isActive: true } }),
      // Today's entries
      prisma.webStory.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.printStory.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.radioStory.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.tVStory.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
    ])

    const totalCoverage = webCount + printCount + radioCount + tvCount
    const todayEntries = todayWebCount + todayPrintCount + todayRadioCount + todayTvCount

    return NextResponse.json({
      totalCoverage,
      activeClients: activeClientsCount,
      todayEntries,
      webCount,
      printCount,
      radioCount,
      tvCount,
    })
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
