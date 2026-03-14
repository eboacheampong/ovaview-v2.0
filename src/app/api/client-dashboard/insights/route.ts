import { NextRequest, NextResponse } from 'next/server'
import { getLatestInsightsForClient } from '@/lib/sent-report-cache'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const clientId = new URL(request.url).searchParams.get('clientId')
  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  }

  try {
    const insights = await getLatestInsightsForClient(clientId)
    return NextResponse.json(insights)
  } catch (error) {
    console.error('[Client Insights] Error:', error)
    return NextResponse.json({ error: 'Failed to load insights' }, { status: 500 })
  }
}
