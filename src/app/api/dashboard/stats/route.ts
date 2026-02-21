import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('role')

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // For data entry users, show only their own stats
    const isDataEntry = userRole === 'data_entry'
    const userFilter = isDataEntry && userId ? { createdById: userId } : {}
    const todayUserFilter = isDataEntry && userId 
      ? { createdById: userId, createdAt: { gte: today, lt: tomorrow } }
      : { createdAt: { gte: today, lt: tomorrow } }

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
      // Total counts (filtered for data entry users)
      prisma.webStory.count({ where: userFilter }),
      prisma.printStory.count({ where: userFilter }),
      prisma.radioStory.count({ where: userFilter }),
      prisma.tVStory.count({ where: userFilter }),
      // Active clients (only for admins)
      isDataEntry ? Promise.resolve(0) : prisma.client.count({ where: { isActive: true } }),
      // Today's entries (filtered for data entry users)
      prisma.webStory.count({ where: todayUserFilter }),
      prisma.printStory.count({ where: todayUserFilter }),
      prisma.radioStory.count({ where: todayUserFilter }),
      prisma.tVStory.count({ where: todayUserFilter }),
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
      isDataEntryView: isDataEntry,
    })
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
