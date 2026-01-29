export interface UpdateConfig {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'realtime'
  industries: string[]
}

export interface Client {
  id: string
  name: string
  contactEmail: string
  contactPhone?: string
  address?: string
  newsUpdateConfig: UpdateConfig
  tenderUpdateConfig: UpdateConfig
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ClientFormData {
  name: string
  contactEmail: string
  contactPhone?: string
  address?: string
  newsUpdateConfig: UpdateConfig
  tenderUpdateConfig: UpdateConfig
}