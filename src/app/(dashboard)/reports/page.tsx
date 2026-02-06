'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileBarChart } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
        <p className="text-gray-500 mt-1">View and manage generated reports</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-orange-500" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Report management is under development. Check back soon!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
