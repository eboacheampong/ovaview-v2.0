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
  Plus,
  BookOpen,
  Layers,
  FileEdit,
  MonitorPlay,
  Antenna,
  NotebookText,
  Tag,
} from 'lucide-react'
import { UserRole } from '@/types/user'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  requiredRole?: UserRole
}

export interface NavSubSection {
  title: string
  icon: LucideIcon
  items: NavItem[]
}

export interface NavSection {
  title: string
  items?: NavItem[]
  subSections?: NavSubSection[]
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
      { label: 'Keywords', href: '/keywords', icon: Tag },
    ],
  },
  {
    title: 'LOG MANAGEMENT',
    items: [
      { label: 'Email Log', href: '/logs/email', icon: Mail, requiredRole: 'admin' },
      { label: 'Visit Log', href: '/logs/visit', icon: Eye, requiredRole: 'admin' },
      { label: 'Tender Log', href: '/logs/tender', icon: FileText, requiredRole: 'admin' },
      { label: 'Media Entry Log', href: '/logs/media-entry', icon: FileEdit, requiredRole: 'admin' },
      { label: 'Client Article Views', href: '/logs/article-views', icon: NotebookText, requiredRole: 'admin' },
    ],
  },
  {
    title: 'MEDIA',
    subSections: [
      {
        title: 'Web Media',
        icon: Globe,
        items: [
          { label: 'Web Stories', href: '/media/web', icon: Globe },
          { label: 'Web Publications', href: '/media/web/publications', icon: BookOpen },
          { label: 'Add Story', href: '/media/web/add', icon: Plus },
        ],
      },
      {
        title: 'Television Media',
        icon: Tv,
        items: [
          { label: 'TV Stories', href: '/media/tv', icon: Tv },
          { label: 'Add Story', href: '/media/tv/add', icon: Plus },
          { label: 'TV Stations', href: '/media/tv/stations', icon: MonitorPlay },
          { label: 'TV Programs', href: '/media/tv/programs', icon: Tv },
        ],
      },
      {
        title: 'Print Media',
        icon: Newspaper,
        items: [
          { label: 'Print Stories', href: '/media/print', icon: Newspaper },
          { label: 'Print Publications', href: '/media/print/publications', icon: BookOpen },
          { label: 'Issues', href: '/media/print/issues', icon: Layers },
          { label: 'Add Story', href: '/media/print/add', icon: Plus },
        ],
      },
      {
        title: 'Radio Media',
        icon: Radio,
        items: [
          { label: 'Radio Stories', href: '/media/radio', icon: Radio },
          { label: 'Add Story', href: '/media/radio/add', icon: Plus },
          { label: 'Radio Stations', href: '/media/radio/stations', icon: Antenna },
          { label: 'Radio Programs', href: '/media/radio/programs', icon: Radio },
        ],
      },
    ],
  },
  {
    title: 'BUSINESS',
    subSections: [
      {
        title: 'Tenders',
        icon: Briefcase,
        items: [
          { label: 'All Tenders', href: '/tenders', icon: Layers },
          { label: 'Tender Industries', href: '/tenders/industries', icon: BookOpen },
          { label: 'Tender Types', href: '/tenders/types', icon: Layers },
          { label: 'Add Tender', href: '/tenders/add', icon: Plus },
        ],
      },
    ],
    items: [
      { label: 'Advanced Reports', href: '/reports/advanced', icon: BarChart3 },
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