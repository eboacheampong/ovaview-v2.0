import { MediaStory, MediaType } from './media'

export type ReportStatus = 'draft' | 'sent' | 'failed'

export interface Report {
  id: string
  title: string
  recipient: string
  recipientEmail: string
  dateFrom: Date
  dateTo: Date
  stories: MediaStory[]
  status: ReportStatus
  sentAt?: Date
  createdBy: string
  createdAt: Date
}

export interface ReportData {
  title: string
  recipient: string
  recipientEmail: string
  dateFrom: Date
  dateTo: Date
  storyIds: string[]
}

export interface ReportDetails {
  title: string
  recipient: string
  dateFrom: Date
  dateTo: Date
  mediaTypes: MediaType[]
}