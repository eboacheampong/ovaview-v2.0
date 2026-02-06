'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Client, UpdateConfig } from '@/types/client'
import { ChevronRight, ChevronLeft } from 'lucide-react'

interface ClientFormProps {
  client?: Client
  onSubmit: (data: Partial<Client>) => Promise<void>
}

const industries = [
  'Agriculture, Food & Beverages',
  'Automobile',
  'Aviation',
  'Banking, Financial Services & Insurance',
  'Consulting',
  'Education & Training',
  'Energy, Power & Electricity',
  'Healthcare & Pharmaceuticals',
  'Information Technology',
  'Manufacturing',
  'Media & Entertainment',
  'Real Estate & Construction',
  'Retail & Consumer Goods',
  'Telecommunications',
  'Transportation & Logistics',
]

const subIndustries: Record<string, string[]> = {
  'Information Technology': ['Software', 'Hardware', 'AI/ML', 'Cybersecurity', 'Cloud Computing'],
  'Banking, Financial Services & Insurance': ['Banking', 'Insurance', 'Investment', 'Fintech'],
  'Healthcare & Pharmaceuticals': ['Pharmaceuticals', 'Medical Devices', 'Hospitals', 'Biotech'],
}

export function ClientForm({ client, onSubmit }: ClientFormProps) {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    contactEmail: client?.contactEmail || '',
    contactPhone: client?.contactPhone || '',
    address: client?.address || '',
  })
  const [activeTab, setActiveTab] = useState<'news' | 'tenders'>('news')
  
  // News config state
  const [newsEmailAlerts, setNewsEmailAlerts] = useState(false)
  const [newsSmsAlerts, setNewsSmsAlerts] = useState(false)
  const [newsKeywords, setNewsKeywords] = useState('')
  const [newsIndustryId, setNewsIndustryId] = useState('')
  const [newsSelectedSubIndustries, setNewsSelectedSubIndustries] = useState<string[]>([])
  
  // Tenders config state
  const [tendersEmailAlerts, setTendersEmailAlerts] = useState(false)
  const [tendersSmsAlerts, setTendersSmsAlerts] = useState(false)
  const [tendersKeywords, setTendersKeywords] = useState('')
  const [tendersSelectedIndustries, setTendersSelectedIndustries] = useState<string[]>([])
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedIndustry = industries.find(i => i === newsIndustryId)
  const availableSubIndustries = selectedIndustry ? (subIndustries[selectedIndustry] || []).filter(s => !newsSelectedSubIndustries.includes(s)) : []
  const availableIndustries = industries.filter(i => !tendersSelectedIndustries.includes(i))

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Client name is required'
    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      await onSubmit({
        ...formData,
        newsUpdateConfig: { enabled: newsEmailAlerts || newsSmsAlerts, frequency: 'daily', industries: newsSelectedSubIndustries },
        tenderUpdateConfig: { enabled: tendersEmailAlerts || tendersSmsAlerts, frequency: 'daily', industries: tendersSelectedIndustries },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Client Name</Label>
        <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter client name" />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactEmail">Contact Email</Label>
        <Input id="contactEmail" type="email" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} placeholder="Enter contact email" />
        {errors.contactEmail && <p className="text-sm text-red-500">{errors.contactEmail}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactPhone">Contact Phone</Label>
        <Input id="contactPhone" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} placeholder="Enter contact phone" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Enter address" />
      </div>

      {/* Configure Updates Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-700 mb-4">Configure Updates</h3>
        <div className="border-b border-gray-200">
          <div className="flex">
            <button type="button" onClick={() => setActiveTab('news')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'news' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>News</button>
            <button type="button" onClick={() => setActiveTab('tenders')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'tenders' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Tenders</button>
          </div>
        </div>

        {activeTab === 'news' && (
          <div className="pt-4 space-y-4">
            <div className="flex gap-8">
              <div className="flex items-center gap-2">
                <Checkbox id="newsEmail" checked={newsEmailAlerts} onCheckedChange={(c) => setNewsEmailAlerts(!!c)} />
                <Label htmlFor="newsEmail" className="text-sm">Email Alerts</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="newsSms" checked={newsSmsAlerts} onCheckedChange={(c) => setNewsSmsAlerts(!!c)} />
                <Label htmlFor="newsSms" className="text-sm">SMS Alerts</Label>
              </div>
            </div>
            <div>
              <Label className="text-gray-700 font-medium">Keywords</Label>
              <textarea className="w-full min-h-[80px] mt-1 rounded-md border border-gray-300 p-3 resize-y" value={newsKeywords} onChange={(e) => setNewsKeywords(e.target.value)} placeholder="keywords" />
            </div>
            <div>
              <Label className="text-gray-700 font-medium">Industry</Label>
              <select className="w-full h-10 mt-1 rounded-md border border-gray-300 px-3 bg-white max-w-md" value={newsIndustryId} onChange={(e) => { setNewsIndustryId(e.target.value); setNewsSelectedSubIndustries([]) }}>
                <option value="">Select Industry</option>
                {industries.map(ind => (<option key={ind} value={ind}>{ind}</option>))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-gray-600 text-center block mb-3">Available Sub-industries</Label>
                <div className="border border-gray-200 rounded-lg h-48 overflow-y-auto bg-gray-50">
                  {availableSubIndustries.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">No more sub-industries</p>
                  ) : (
                    availableSubIndustries.map(s => (
                      <div key={s} className="px-4 py-3 hover:bg-white cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0 transition-colors" onClick={() => setNewsSelectedSubIndustries([...newsSelectedSubIndustries, s])}>
                        <span className="text-gray-700">{s}</span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <Label className="text-gray-600 text-center block mb-3">Selected Sub-industries</Label>
                <div className="border border-gray-200 rounded-lg h-48 overflow-y-auto bg-orange-50">
                  {newsSelectedSubIndustries.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">Click to add sub-industries</p>
                  ) : (
                    newsSelectedSubIndustries.map(s => (
                      <div key={s} className="px-4 py-3 hover:bg-orange-100 cursor-pointer flex justify-between items-center border-b border-orange-100 last:border-0 transition-colors" onClick={() => setNewsSelectedSubIndustries(newsSelectedSubIndustries.filter(x => x !== s))}>
                        <ChevronLeft className="h-4 w-4 text-orange-400" />
                        <span className="text-gray-700">{s}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tenders' && (
          <div className="pt-4 space-y-4">
            <div className="flex gap-8">
              <div className="flex items-center gap-2">
                <Checkbox id="tendersEmail" checked={tendersEmailAlerts} onCheckedChange={(c) => setTendersEmailAlerts(!!c)} />
                <Label htmlFor="tendersEmail" className="text-sm">Email Alerts</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="tendersSms" checked={tendersSmsAlerts} onCheckedChange={(c) => setTendersSmsAlerts(!!c)} />
                <Label htmlFor="tendersSms" className="text-sm">SMS Alerts</Label>
              </div>
            </div>
            <div>
              <Label className="text-gray-700 font-medium">Keywords</Label>
              <textarea className="w-full min-h-[80px] mt-1 rounded-md border border-gray-300 p-3 resize-y" value={tendersKeywords} onChange={(e) => setTendersKeywords(e.target.value)} placeholder="keywords" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-700 mb-4">Industries</h4>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-gray-600 text-center block mb-3">Available Industries</Label>
                  <div className="border border-gray-200 rounded-lg h-48 overflow-y-auto bg-gray-50">
                    {availableIndustries.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-4">No more industries</p>
                    ) : (
                      availableIndustries.map(ind => (
                        <div key={ind} className="px-4 py-3 hover:bg-white cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0 transition-colors" onClick={() => setTendersSelectedIndustries([...tendersSelectedIndustries, ind])}>
                          <span className="text-gray-700">{ind}</span>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-600 text-center block mb-3">Selected Industries</Label>
                  <div className="border border-gray-200 rounded-lg h-48 overflow-y-auto bg-orange-50">
                    {tendersSelectedIndustries.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-4">Click to add industries</p>
                    ) : (
                      tendersSelectedIndustries.map(ind => (
                        <div key={ind} className="px-4 py-3 hover:bg-orange-100 cursor-pointer flex justify-between items-center border-b border-orange-100 last:border-0 transition-colors" onClick={() => setTendersSelectedIndustries(tendersSelectedIndustries.filter(x => x !== ind))}>
                          <ChevronLeft className="h-4 w-4 text-orange-400" />
                          <span className="text-gray-700">{ind}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" disabled={isSubmitting} className="bg-gray-400 hover:bg-gray-500 text-white">
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
