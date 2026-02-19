import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const issue = await prisma.printIssue.findUnique({
      where: { id },
      include: { publication: { select: { id: true, name: true } } },
    })
    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    return NextResponse.json(issue)
  } catch (error) {
    console.error('Error fetching print issue:', error)
    return NextResponse.json({ error: 'Failed to fetch issue' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, publicationId, issueDate, isActive } = body

    const issue = await prisma.printIssue.update({
      where: { id },
      data: {
        name: name ?? undefined,
        publicationId: publicationId ?? undefined,
        issueDate: issueDate ? new Date(issueDate) : undefined,
        isActive: isActive ?? undefined,
      },
      include: { publication: { select: { id: true, name: true } } },
    })

    return NextResponse.json(issue)
  } catch (error) {
    console.error('Error updating print issue:', error)
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.printIssue.delete({ where: { id } })
    return NextResponse.json({ message: 'Issue deleted' })
  } catch (error) {
    console.error('Error deleting print issue:', error)
    return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 })
  }
}
