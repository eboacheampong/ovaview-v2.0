'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  FileBarChart, BarChart3, TrendingUp, PieChart, Calendar, Download,
  ArrowRight, Clock, Users, Newspaper, Mail, FileText, Zap
} from 'lucide-react'

const reportTypes = [
  {
    title: 'Advanced Analytics',
    description: 'Comprehensive media monitoring insights with interactive charts and KPIs',
    icon: BarChart3,
    href: '/reports/advanced',
    color: 'orange',
    features: ['Coverage Trends', 'Sentiment Analysis', 'Share of Voice', 'Competitor Comparison'],
  },
  {
    title: 'Client Reports',
    description: 'Generate detailed reports for individual clients with custom date ranges',
    icon: Users,
    href: '/reports/client',
    color: 'blue',
    features: ['Custom Date Range', 'Media Breakdown', 'Sentiment Score', 'PDF Export'],
    comingSoon: true,
  },
  {
    title: 'Scheduled Reports',
    description: 'Set up automated reports delivered to clients on a schedule',
    icon: Calendar,
    href: '/reports/scheduled',
    color: 'emerald',
    features: ['Daily/Weekly/Monthly', 'Email Delivery', 'Custom Templates', 'Auto-generation'],
    comingSoon: true,
  },
  {
    title: 'Media Coverage',
    description: 'Detailed breakdown of media coverage across all channels',
    icon: Newspaper,
    href: '/reports/coverage',
    color: 'violet',
    features: ['By Media Type', 'By Publication', 'By Region', 'Historical Data'],
    comingSoon: true,
  },
]

const recentReports = [
  { id: 1, title: 'Monthly Coverage Report - January 2026', client: 'Safaricom', date: '2026-02-01', status: 'sent' },
  { id: 2, title: 'Weekly Sentiment Analysis', client: 'KCB Bank', date: '2026-02-05', status: 'sent' },
  { id: 3, title: 'Competitor Analysis Q4 2025', client: 'Equity Bank', date: '2026-01-28', status: 'draft' },
  { id: 4, title: 'Crisis Monitoring Report', client: 'Kenya Airways', date: '2026-02-03', status: 'sent' },
]

export default function ReportsPage() {
  return (
    <div className="p-4 sm:p-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
              <FileBarChart className="h-6 w-6" />
            </div>
            Reports
          </h1>
          <p className="text-gray-500 mt-1">Generate, schedule, and manage media monitoring reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Clock className="h-4 w-4" />
            Report History
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600 gap-2">
            <FileText className="h-4 w-4" />
            New Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">156</p>
                <p className="text-sm text-gray-500">Total Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Mail className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">142</p>
                <p className="text-sm text-gray-500">Sent This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100">
                <Calendar className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">24</p>
                <p className="text-sm text-gray-500">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">8</p>
                <p className="text-sm text-gray-500">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Types */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Report Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTypes.map((report, index) => (
            <Card key={index} className={`glass-card hover-lift group ${report.comingSoon ? 'opacity-75' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-${report.color}-100 group-hover:bg-${report.color}-200 transition-colors`}>
                    <report.icon className={`h-6 w-6 text-${report.color}-600`} />
                  </div>
                  {report.comingSoon && (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{report.title}</h3>
                <p className="text-sm text-gray-500 mb-4">{report.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {report.features.map((feature, i) => (
                    <span key={i} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                      {feature}
                    </span>
                  ))}
                </div>
                {!report.comingSoon ? (
                  <Link href={report.href}>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 gap-2">
                      Open Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button disabled className="w-full gap-2">
                    Coming Soon
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Reports */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Reports</CardTitle>
              <CardDescription>Latest generated and sent reports</CardDescription>
            </div>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100">
                    <FileText className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{report.title}</p>
                    <p className="text-xs text-gray-500">{report.client} • {report.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    report.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                  </span>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
