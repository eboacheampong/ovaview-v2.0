import { Industry } from './industry'

export type MediaType = 'print' | 'radio' | 'tv' | 'web'

export interface MediaStory {
  id: string
  title: string
  slug: string
  content: string
  mediaType: MediaType
  date: Date
  industryId: string
  industry?: Industry
  createdAt: Date
  updatedAt: Date
}

export interface PrintStory extends MediaStory {
  mediaType: 'print'
  publicationId: string
  publication?: Publication
  issueId: string
  issue?: Issue
}

export interface RadioStory extends MediaStory {
  mediaType: 'radio'
  stationId: string
  station?: RadioStation
  programId?: string
  program?: Program
}

export interface TVStory extends MediaStory {
  mediaType: 'tv'
  stationId: string
  station?: TVStation
  programId?: string
  program?: Program
}

export interface WebStory extends MediaStory {
  mediaType: 'web'
  publicationId: string
  publication?: Publication
  url: string
  summary?: string
  author?: string
  images?: string[]
  keywords?: string
}

export interface Publication {
  id: string
  name: string
  type: 'print' | 'web'
  website?: string
  isActive: boolean
}

export interface Issue {
  id: string
  publicationId: string
  publication?: Publication
  issueDate: Date
  issueNumber?: string
}

export interface RadioStation {
  id: string
  name: string
  frequency: string
  location?: string
  isActive: boolean
}

export interface TVStation {
  id: string
  name: string
  location?: string
  reach?: number
  isActive: boolean
}

export interface Program {
  id: string
  name: string
  stationId: string
  stationType: 'radio' | 'tv'
  schedule?: string
  isActive: boolean
}

export interface StoryFormData {
  title: string
  content: string
  date: Date
  industryId: string
  sourceId: string
  programId?: string
  issueId?: string
  url?: string
}