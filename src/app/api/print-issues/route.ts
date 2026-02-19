import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const issues = await prisma.printIssue.findMany({
      where: { isActive: true },
      include: { publication: { select: { id: true, name: true } } },
      orderBy: { issueDate: 'desc' },
    })
    return NextResponse.json(issues)
  } catch (error) {
    console.error('Error fetching print issues:', error)
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, publicationId, issueDate } = body

    if (!name || !publicationId) {
      return NextResponse.json({ error: 'Name and publication are required' }, { status: 400 })
    }

    const issue = await prisma.printIssue.create({
      data: {
        name,
        publicationId,
        issueDate: issueDate ? new Date(issueDate) : null,
      },
      include: { publication: { select: { id: true, name: true } } },
    })

    return NextResponse.json(issue, { status: 201 })
  } catch (error) {
    console.error('Error creating print issue:', error)
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 })
  }
}
