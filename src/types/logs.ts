import { MediaType } from './media'
import { User } from './user'
import { Tender } from './tender'

export interface EmailLog {
  id: string
  recipient: string
  subject: string
  articleId?: string
  articleType?: MediaType
  status: 'sent' | 'failed'
  errorMessage?: string
  sentAt: Date
}

export interface VisitLog {
  id: string
  userId: string
  user?: User
  ipAddress: string
  page: string
  articleId?: string
  mediaType?: MediaType
  visitedAt: Date
}

export interface TenderLog {
  id: string
  userId: string
  user?: User
  tenderId: string
  tender?: Tender
  viewedAt: Date
}