export interface UpdateConfig {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'realtime'
  industries: string[]
}

export interface ClientIndustry {
  id: string
  industryId: string
  industry: {
    id: string
    name: string
  }
}

export interface Client {
  id: string
  name: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  postalAddress?: string
  webAddress?: string
  contactPerson?: string
  logoUrl?: string
  expiryDate?: Date | null
  newsUpdateConfig?: UpdateConfig
  tenderUpdateConfig?: UpdateConfig
  newsEmailAlerts?: boolean
  newsSmsAlerts?: boolean
  newsKeywords?: string
  tenderEmailAlerts?: boolean
  tenderSmsAlerts?: boolean
  tenderKeywords?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  users?: { id: string }[]
  industries?: ClientIndustry[]
}

export interface ClientFormData {
  name: string
  contactEmail: string
  contactPhone?: string
  address?: string
  newsUpdateConfig: UpdateConfig
  tenderUpdateConfig: UpdateConfig
}