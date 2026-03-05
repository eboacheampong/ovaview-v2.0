import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// DELETE all social posts
export async function DELETE() {
  try {
    // Delete sub-industry relations first (cascade should handle this but being explicit)
    await prisma.socialPostSubIndustry.deleteMany({})
    
    // Delete all social posts
    const result = await prisma.socialPost.deleteMany({})

    return NextResponse.json({
      success: true,
      deleted: result.count,
    })
  } catch (error) {
    console.error('Error clearing social posts:', error)
    return NextResponse.json({ error: 'Failed to clear social posts' }, { status: 500 })
  }
}
