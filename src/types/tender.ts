import { Industry } from './industry'

export type TenderStatus = 'open' | 'closed' | 'awarded'

export interface Tender {
  id: string
  title: string
  description: string
  deadline: Date
  typeId: string
  type?: TenderType
  industries: Industry[]
  status: TenderStatus
  createdAt: Date
  updatedAt: Date
}

export interface TenderType {
  id: string
  name: string
  description?: string
}

export interface TenderIndustry {
  id: string
  tenderId: string
  industryId: string
}

export interface TenderFormData {
  title: string
  description: string
  deadline: Date
  typeId: string
  industryIds: string[]
  status: TenderStatus
}