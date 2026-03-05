'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  FileBarChart, BarChart3, Brain, Calendar, ArrowRight, Newspaper
} from 'lucide-react'

const reportTypes = [
  {
    title: 'Advanced Analytics',
    description: 'Comprehensive media monitoring insights with interactive charts and KPIs',
    icon: BarChart3,
    href: '/reports/advanced',
    color: 'orange',
    gradient: 'from-orange-500 to-amber-500',
    features: ['Coverage Trends', 'Sentiment Analysis', 'Share of Voice', 'Competitor Comparison'],
  },
  {
    title: 'AI Insights',
    description: 'AI-powered analysis with detailed insights, trends, and strategic recommendations',
    icon: Brain,
    href: '/reports/ai-insights',
    color: 'violet',
    gradient: 'from-violet-500 to-purple-600',
    features: ['AI Analysis', 'Trend Detection', 'Recommendations', 'Custom Date Range'],
  },
  {
    title: 'Media Insights',
    description: 'Detailed media coverage breakdown with stats, sentiment, sources, and top mentions',
    icon: Newspaper,
    href: '/reports/media-insights',
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-500',
    features: ['Media Breakdown', 'Sentiment Score', 'Source Distribution', 'Custom Date Range'],
  },
  {
    title: 'Scheduled Reports',
    description: 'View and manage automated daily, weekly, and monthly report schedules for all clients',
    icon: Calendar,
    href: '/reports/scheduled',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500',
    features: ['Daily Updates', 'Weekly Media & AI', 'Monthly AI Insights', 'Email Delivery'],
  },
]

export default function ReportsPage() {
  return (
    <div className="p-4 sm:p-6 animate-fadeIn">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reportTypes.map((report, index) => (
          <Card key={index} className="glass-card hover-lift group overflow-hidden">
            <CardContent className="p-0">
              <div className={`h-2 bg-gradient-to-r ${report.gradient}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-${report.color}-100 group-hover:bg-${report.color}-200 transition-colors`}>
                    <report.icon className={`h-6 w-6 text-${report.color}-600`} />
                  </div>
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
                <Link href={report.href}>
                  <Button className={`w-full bg-gradient-to-r ${report.gradient} hover:opacity-90 gap-2 text-white`}>
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
