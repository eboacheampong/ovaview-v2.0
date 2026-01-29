import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const userSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.enum(['admin', 'client']),
  isActive: z.boolean(),
})

export const clientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  contactEmail: z.string().email('Invalid email format'),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  newsUpdateConfig: z.object({
    enabled: z.boolean(),
    frequency: z.enum(['daily', 'weekly', 'realtime']),
    industries: z.array(z.string()),
  }),
  tenderUpdateConfig: z.object({
    enabled: z.boolean(),
    frequency: z.enum(['daily', 'weekly', 'realtime']),
    industries: z.array(z.string()),
  }),
})

export const storySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  date: z.date(),
  industryId: z.string().min(1, 'Industry is required'),
  sourceId: z.string().min(1, 'Source is required'),
  programId: z.string().optional(),
  issueId: z.string().optional(),
  url: z.string().url('Invalid URL format').optional(),
})

export const tenderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  deadline: z.date(),
  typeId: z.string().min(1, 'Type is required'),
  industryIds: z.array(z.string()).min(1, 'At least one industry is required'),
  status: z.enum(['open', 'closed', 'awarded']),
})

export const industrySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  parentId: z.string().optional(),
})

export const reportSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  recipient: z.string().min(1, 'Recipient is required'),
  recipientEmail: z.string().email('Invalid email format'),
  dateFrom: z.date(),
  dateTo: z.date(),
  storyIds: z.array(z.string()).min(1, 'At least one story is required'),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const profileSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type UserFormData = z.infer<typeof userSchema>
export type ClientFormData = z.infer<typeof clientSchema>
export type StoryFormData = z.infer<typeof storySchema>
export type TenderFormData = z.infer<typeof tenderSchema>
export type IndustryFormData = z.infer<typeof industrySchema>
export type ReportFormData = z.infer<typeof reportSchema>
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>
export type ProfileFormData = z.infer<typeof profileSchema>