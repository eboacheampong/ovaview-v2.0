import {
  Users,
  Building2,
  UserCog,
  Mail,
  Eye,
  FileText,
  Factory,
  Newspaper,
  Radio,
  Tv,
  Globe,
  Briefcase,
  FileBarChart,
  BarChart3,
  Settings,
  LogOut,
  LayoutDashboard,
  LucideIcon,
} from 'lucide-react'
import { UserRole } from '@/types/user'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  requiredRole?: UserRole
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const navigationSections: NavSection[] = [
  {
    title: 'USER MANAGEMENT',
    items: [
      { label: 'User Management', href: '/users', icon: Users, requiredRole: 'admin' },
      { label: 'Client Management', href: '/clients', icon: Building2, requiredRole: 'admin' },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { label: 'Industry Data', href: '/industries', icon: Factory },
    ],
  },
  {
    title: 'LOG MANAGEMENT',
    items: [
      { label: 'Email Log', href: '/logs/email', icon: Mail, requiredRole: 'admin' },
      { label: 'Visit Log', href: '/logs/visit', icon: Eye, requiredRole: 'admin' },
      { label: 'Tender Log', href: '/logs/tender', icon: FileText, requiredRole: 'admin' },
    ],
  },
  {
    title: 'MEDIA',
    items: [
      { label: 'Print Media', href: '/media/print', icon: Newspaper },
      { label: 'Radio Media', href: '/media/radio', icon: Radio },
      { label: 'Television Media', href: '/media/tv', icon: Tv },
      { label: 'Web Media', href: '/media/web', icon: Globe },
    ],
  },
  {
    title: 'BUSINESS',
    items: [
      { label: 'Advanced Reports', href: '/reports/advanced', icon: BarChart3 },
      { label: 'Tenders', href: '/tenders', icon: Briefcase },
      { label: 'Reports', href: '/reports', icon: FileBarChart },
    ],
  },
]

export const bottomNavItems: NavItem[] = [
  { label: 'Account Settings', href: '/settings', icon: Settings },
]

export const dashboardItem: NavItem = {
  label: 'Dashboard',
  href: '/dashboard',
  icon: LayoutDashboard,
}