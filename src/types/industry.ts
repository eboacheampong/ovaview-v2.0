export interface Industry {
  id: string
  name: string
  parentId?: string
  parent?: Industry
  subIndustries?: Industry[]
  createdAt: Date
  updatedAt: Date
}

export interface IndustryFormData {
  name: string
  parentId?: string
}