import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SocialPlatform } from '@prisma/client'
import { generateSlug } from '@/lib/slug'

export const dynamic = 'force-dynamic'

/** Generate a unique slug for a social post */
async function generateSocialSlug(content: string, platform: string, authorName?: string): Promise<string> {
  const prefix = platform.toLowerCase()
  const snippet = (content || 'social-post').substring(0, 60).trim()
  const author = authorName ? `-${authorName}` : ''
  const raw = `${prefix}${author}-${snippet}`
  const baseSlug = generateSlug(raw)

  let slug = baseSlug
  let counter = 1
  while (await prisma.socialPost.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`
    counter++
  }
  return slug
}

// GET all social posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const platform = searchParams.get('platform') as SocialPlatform | null
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status') // 'pending' | 'accepted' | 'archived' | 'all'

    const skip = (page - 1) * limit

    const where: any = {}

    // Status filter — default to 'accepted' (published posts) unless explicitly set
    if (status === 'all') {
      // No status filter
    } else if (status) {
      where.status = status
    } else {
      where.status = 'accepted'
    }
    
    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { authorHandle: { contains: search, mode: 'insensitive' } },
        { authorName: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    if (platform) {
      where.platform = platform
    }

    if (clientId) {
      where.clientId = clientId
    }

    const [posts, total] = await Promise.all([
      prisma.socialPost.findMany({
        where,
        include: {
          account: true,
          industry: true,
          client: { select: { id: true, name: true } },
          subIndustries: { include: { subIndustry: true } },
        },
        orderBy: { postedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.socialPost.count({ where }),
    ])

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching social posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

// POST create new social post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      platform,
      postId,
      content,
      summary,
      authorHandle,
      authorName,
      authorAvatarUrl,
      postUrl,
      embedUrl,
      embedHtml,
      mediaUrls,
      mediaType,
      likesCount,
      commentsCount,
      sharesCount,
      viewsCount,
      hashtags,
      mentions,
      keywords,
      postedAt,
      accountId,
      clientId,
      industryId,
      subIndustryIds,
      sentimentPositive,
      sentimentNeutral,
      sentimentNegative,
      overallSentiment,
      keyPersonalities,
      status,
    } = body

    if (!platform || !postId || !postUrl) {
      return NextResponse.json(
        { error: 'platform, postId, and postUrl are required' },
        { status: 400 }
      )
    }

    // Check if post already exists for this client
    const existing = await prisma.socialPost.findFirst({
      where: { platform, postId, clientId: clientId || null },
    })

    if (existing) {
      // If it exists as pending and we're creating as accepted, update it
      if (existing.status === 'pending' && (status === 'accepted' || !status)) {
        // Generate slug when accepting
        const postTitle = content || existing.content || 'Social Post'
        const slug = existing.slug || await generateSocialSlug(postTitle, existing.platform, existing.authorName || undefined)
        const title = existing.title || postTitle.substring(0, 120)

        const updated = await prisma.socialPost.update({
          where: { id: existing.id },
          data: {
            status: 'accepted',
            title,
            slug,
            summary,
            embedUrl,
            embedHtml,
            industryId,
            sentimentPositive,
            sentimentNeutral,
            sentimentNegative,
            overallSentiment,
            keyPersonalities: keyPersonalities || null,
            subIndustries: subIndustryIds?.length
              ? {
                  deleteMany: {},
                  create: subIndustryIds.map((id: string) => ({ subIndustryId: id })),
                }
              : undefined,
          },
          include: {
            account: true,
            client: { select: { id: true, name: true } },
            industry: true,
            subIndustries: { include: { subIndustry: true } },
          },
        })
        return NextResponse.json(updated, { status: 200 })
      }
      return NextResponse.json(
        { error: 'Post already exists', id: existing.id },
        { status: 409 }
      )
    }

    // Generate slug + title for accepted posts
    const effectiveStatus = status || 'accepted'
    const postTitle = (content || 'Social Post').substring(0, 120)
    const slug = effectiveStatus === 'accepted'
      ? await generateSocialSlug(content || '', platform, authorName || undefined)
      : undefined

    const post = await prisma.socialPost.create({
      data: {
        platform,
        postId,
        title: postTitle,
        slug,
        content,
        summary,
        authorHandle,
        authorName,
        authorAvatarUrl,
        postUrl,
        embedUrl,
        embedHtml,
        mediaUrls: mediaUrls || [],
        mediaType,
        likesCount,
        commentsCount,
        sharesCount,
        viewsCount,
        hashtags: hashtags || [],
        mentions: mentions || [],
        keywords,
        status: effectiveStatus,
        postedAt: new Date(postedAt),
        accountId,
        clientId,
        industryId,
        sentimentPositive,
        sentimentNeutral,
        sentimentNegative,
        overallSentiment,
        keyPersonalities: keyPersonalities || null,
        subIndustries: subIndustryIds?.length
          ? {
              create: subIndustryIds.map((id: string) => ({
                subIndustryId: id,
              })),
            }
          : undefined,
      },
      include: {
        account: true,
        client: { select: { id: true, name: true } },
        industry: true,
        subIndustries: { include: { subIndustry: true } },
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Error creating social post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
