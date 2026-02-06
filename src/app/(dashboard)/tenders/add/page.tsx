'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save } from 'lucide-react'
import { TenderStatus } from '@/types/tender'

export default function AddTenderPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    typeId: '',
    deadline: '',
    status: 'open' as TenderStatus,
    industries: [] as string[],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSubmitting(false)
    router.push('/tenders')
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Add Tender</h1>
          <p className="text-gray-500 mt-1">Create a new tender opportunity</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Tender Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea id="description" className="w-full min-h-[150px] rounded-md border p-2" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Tender Type</Label>
                <select id="type" className="w-full h-10 rounded-md border px-3" value={formData.typeId} onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}>
                  <option value="">Select type</option>
                  <option value="1">IT Services</option>
                  <option value="2">Construction</option>
                  <option value="3">Consulting</option>
                  <option value="4">Procurement</option>
                </select>
              </div>
              <div>
                <Label htmlFor="deadline">Deadline</Label>
                <Input id="deadline" type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} required />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" className="w-full h-10 rounded-md border px-3" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as TenderStatus })}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="awarded">Awarded</option>
              </select>
            </div>
            <div>
              <Label>Industries</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['Information Technology', 'Construction', 'Healthcare', 'Education', 'Agriculture'].map((industry, idx) => (
                  <label key={idx} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    {industry}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />{isSubmitting ? 'Saving...' : 'Save Tender'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
