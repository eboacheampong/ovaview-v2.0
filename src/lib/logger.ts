import { prisma } from './prisma'
import { MediaType } from '@prisma/client'

// Fire-and-forget logging - doesn't block the main request
const logQueue: Array<() => Promise<void>> = []
let isProcessing = false

async function processQueue() {
  if (isProcessing || logQueue.length === 0) return
  isProcessing = true
  
  while (logQueue.length > 0) {
    const task = logQueue.shift()
    if (task) {
      try {
        await task()
      } catch (error) {
        console.error('Log queue error:', error)
      }
    }
  }
  
  isProcessing = false
}

function enqueue(task: () => Promise<void>) {
  logQueue.push(task)
  // Process async without blocking
  setImmediate(processQueue)
}

// Article view logging
export function logArticleView(data: {
  clientId: string
  userId: string
  articleId: string
  articleTitle: string
  mediaType: MediaType
  duration?: number
}) {
  enqueue(async () => {
    await prisma.articleViewLog.create({
      data: {
        clientId: data.clientId,
        userId: data.userId,
        articleId: data.articleId,
        articleTitle: data.articleTitle,
        mediaType: data.mediaType,
        duration: data.duration || 0,
      },
    })
  })
}


// Media entry logging (CRUD operations)
export function logMediaEntry(data: {
  userId: string
  mediaType: MediaType
  publisher: string
  storyId: string
  storyTitle: string
  action: 'created' | 'updated' | 'deleted'
}) {
  enqueue(async () => {
    await prisma.mediaEntryLog.create({
      data: {
        userId: data.userId,
        mediaType: data.mediaType,
        publisher: data.publisher,
        storyId: data.storyId,
        storyTitle: data.storyTitle,
        action: data.action,
      },
    })
  })
}

// Email logging
export function logEmail(data: {
  recipient: string
  subject: string
  articleId?: string
  articleType?: MediaType
  status: 'sent' | 'failed'
  errorMessage?: string
}) {
  enqueue(async () => {
    await prisma.emailLog.create({
      data: {
        recipient: data.recipient,
        subject: data.subject,
        articleId: data.articleId,
        articleType: data.articleType,
        status: data.status,
        errorMessage: data.errorMessage,
      },
    })
  })
}

// Visit logging
export function logVisit(data: {
  userId?: string
  ipAddress: string
  userAgent?: string
  page: string
  articleId?: string
  mediaType?: MediaType
}) {
  enqueue(async () => {
    await prisma.visitLog.create({
      data: {
        userId: data.userId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        page: data.page,
        articleId: data.articleId,
        mediaType: data.mediaType,
      },
    })
  })
}

// Tender view logging
export function logTenderView(data: {
  userId: string
  tenderId: string
  tenderTitle?: string
}) {
  enqueue(async () => {
    await prisma.tenderViewLog.create({
      data: {
        userId: data.userId,
        tenderId: data.tenderId,
        tenderTitle: data.tenderTitle,
      },
    })
  })
}

// Batch logging for high-volume scenarios
export function logVisitsBatch(visits: Array<{
  userId?: string
  ipAddress: string
  userAgent?: string
  page: string
  articleId?: string
  mediaType?: MediaType
}>) {
  if (visits.length === 0) return
  
  enqueue(async () => {
    await prisma.visitLog.createMany({
      data: visits.map(v => ({
        userId: v.userId,
        ipAddress: v.ipAddress,
        userAgent: v.userAgent,
        page: v.page,
        articleId: v.articleId,
        mediaType: v.mediaType,
      })),
    })
  })
}