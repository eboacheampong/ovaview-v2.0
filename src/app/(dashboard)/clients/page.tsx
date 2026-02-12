'use client'

import { useState, useEffect, useRef } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog, PasswordConfirmModal, ViewModal, FormModal } from '@/components/modals'
import { KeywordTagInput } from '@/components/forms/keyword-tag-input'
import { useModal } from '@/hooks/use-modal'
import { Client } from '@/types/client'
import { Trash2, Users, Camera, Pencil, ChevronRight, ChevronLeft, Building2, Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Industry {
  id: string
  name: string
  subIndustries: { id: string; name: string }[]
}

type TabType = 'list' | 'create'
type ConfigTab = 'news' | 'tenders'

export default function ClientsPage() {
  const router = useRouter()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const editLogoInputRef = useRef<HTMLInputElement>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('list')
  const [configTab, setConfigTab] = useState<ConfigTab>('news')
  const [isLoading, setIsLoading] = useState(true)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null)
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '', email: '', postalAddress: '', physicalAddress: '', webAddress: '',
    phoneNumber: '', contactPerson: '', expiryDate: '', isActive: false,
  })

  // News config state
  const [newsEmailAlerts, setNewsEmailAlerts] = useState(false)
  const [newsSmsAlerts, setNewsSmsAlerts] = useState(false)
  const [newsKeywords, setNewsKeywords] = useState<string[]>([])
  const [newsIndustryId, setNewsIndustryId] = useState('')
  const [newsSelectedSubIndustries, setNewsSelectedSubIndustries] = useState<string[]>([])
  
  // Tenders config state
  const [tendersEmailAlerts, setTendersEmailAlerts] = useState(false)
  const [tendersSmsAlerts, setTendersSmsAlerts] = useState(false)
  const [tendersKeywords, setTendersKeywords] = useState<string[]>([])
  const [tendersSelectedIndustries, setTendersSelectedIndustries] = useState<string[]>([])
  
  const [pendingAction, setPendingAction] = useState<{ type: 'create' | 'delete' | 'toggle'; data?: Client | typeof formData } | null>(null)
  const deleteModal = useModal<Client>()
  const passwordModal = useModal<undefined>()
  const viewModal = useModal<Client>()
  const editModal = useModal<Client>()
  const [editFormData, setEditFormData] = useState({
    name: '', email: '', postalAddress: '', physicalAddress: '', webAddress: '',
    phoneNumber: '', contactPerson: '', expiryDate: '', isActive: false,
  })
  const [editConfigTab, setEditConfigTab] = useState<ConfigTab>('news')
  const [editNewsEmailAlerts, setEditNewsEmailAlerts] = useState(false)
  const [editNewsSmsAlerts, setEditNewsSmsAlerts] = useState(false)
  const [editNewsKeywords, setEditNewsKeywords] = useState<string[]>([])
  const [editNewsIndustryId, setEditNewsIndustryId] = useState('')
  const [editNewsSelectedSubIndustries, setEditNewsSelectedSubIndustries] = useState<string[]>([])
  const [editTendersEmailAlerts, setEditTendersEmailAlerts] = useState(false)
  const [editTendersSmsAlerts, setEditTendersSmsAlerts] = useState(false)
  const [editTendersKeywords, setEditTendersKeywords] = useState<string[]>([])
  const [editTendersSelectedIndustries, setEditTendersSelectedIndustries] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchClients()
    fetchIndustries()
  }, [])

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data.map((c: Record<string, unknown>) => ({
          ...c,
          contactEmail: c.email,
          contactPhone: c.phone,
          newsUpdateConfig: { enabled: c.newsEmailAlerts || c.newsSmsAlerts, frequency: 'daily', industries: [] },
          tenderUpdateConfig: { enabled: c.tenderEmailAlerts || c.tenderSmsAlerts, frequency: 'daily', industries: [] },
          createdAt: new Date(c.createdAt as string),
          updatedAt: new Date(c.updatedAt as string),
        })))
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchIndustries = async () => {
    try {
      const res = await fetch('/api/industries')
      if (res.ok) setIndustries(await res.json())
    } catch (err) {
      console.error('Failed to fetch industries:', err)
    }
  }

  const selectedIndustry = industries.find(i => i.id === newsIndustryId)
  const availableSubIndustries = selectedIndustry?.subIndustries.filter(s => !newsSelectedSubIndustries.includes(s.id)) || []
  const availableIndustries = industries.filter(i => !tendersSelectedIndustries.includes(i.id))
  const editSelectedIndustry = industries.find(i => i.id === editNewsIndustryId)
  const editAvailableSubIndustries = editSelectedIndustry?.subIndustries.filter(s => !editNewsSelectedSubIndustries.includes(s.id)) || []
  const editAvailableIndustries = industries.filter(i => !editTendersSelectedIndustries.includes(i.id))

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
      if (file.size > 5 * 1024 * 1024) { alert('Image must be less than 5MB'); return }
      if (isEdit) {
        setEditLogoFile(file)
        setEditLogoPreview(URL.createObjectURL(file))
      } else {
        setLogoFile(file)
        setLogoPreview(URL.createObjectURL(file))
      }
    }
  }

  const uploadLogo = async (file: File): Promise<string | null> => {
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)
    formDataUpload.append('folder', 'client-logos')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formDataUpload })
      if (res.ok) {
        const { url } = await res.json()
        return url
      }
    } catch (err) {
      console.error('Logo upload failed:', err)
    }
    return null
  }

  const validatePassword = async (password: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    if (password !== 'password') throw new Error('Invalid password')
    return true
  }

  const handleCreateSubmit = () => {
    if (!formData.name || !formData.email) return
    setPendingAction({ type: 'create', data: formData })
    passwordModal.open()
  }

  const handlePasswordConfirm = async (password: string) => {
    await validatePassword(password)
    setIsSubmitting(true)
    try {
      if (pendingAction?.type === 'create') {
        let logoUrl = null
        if (logoFile) logoUrl = await uploadLogo(logoFile)
        
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name, email: formData.email, phone: formData.phoneNumber,
            address: formData.physicalAddress, postalAddress: formData.postalAddress,
            webAddress: formData.webAddress, contactPerson: formData.contactPerson,
            expiryDate: formData.expiryDate || null, isActive: formData.isActive, logoUrl,
            newsEmailAlerts, newsSmsAlerts, newsKeywords: newsKeywords.join(', '),
            newsIndustryIds: newsSelectedSubIndustries,
            tenderEmailAlerts: tendersEmailAlerts, tenderSmsAlerts: tendersSmsAlerts,
            tenderKeywords: tendersKeywords.join(', '), tenderIndustryIds: tendersSelectedIndustries,
          }),
        })
        if (res.ok) {
          await fetchClients()
          resetForm()
          setActiveTab('list')
        }
      } else if (pendingAction?.type === 'delete') {
        const client = pendingAction.data as Client
        const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' })
        if (res.ok) setClients(clients.filter(c => c.id !== client.id))
      } else if (pendingAction?.type === 'toggle') {
        const client = pendingAction.data as Client
        const res = await fetch(`/api/clients/${client.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !client.isActive }),
        })
        if (res.ok) setClients(clients.map(c => c.id === client.id ? { ...c, isActive: !c.isActive } : c))
      }
    } finally {
      setIsSubmitting(false)
      setPendingAction(null)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', email: '', postalAddress: '', physicalAddress: '', webAddress: '', phoneNumber: '', contactPerson: '', expiryDate: '', isActive: false })
    setNewsEmailAlerts(false); setNewsSmsAlerts(false); setNewsKeywords([]); setNewsIndustryId(''); setNewsSelectedSubIndustries([])
    setTendersEmailAlerts(false); setTendersSmsAlerts(false); setTendersKeywords([]); setTendersSelectedIndustries([])
    setLogoFile(null); setLogoPreview(null)
  }

  const handleDeleteClick = (client: Client) => deleteModal.open(client)
  const handleDeleteConfirm = async () => { setPendingAction({ type: 'delete', data: deleteModal.data! }); deleteModal.close(); passwordModal.open() }
  const handleToggleStatus = (client: Client) => { setPendingAction({ type: 'toggle', data: client }); passwordModal.open() }
  const handleViewClient = (client: Client) => viewModal.open(client)

  const handleEditClient = (client: Client) => {
    setEditFormData({
      name: client.name, email: client.contactEmail || '', postalAddress: client.postalAddress || '',
      physicalAddress: client.address || '', webAddress: client.webAddress || '',
      phoneNumber: client.contactPhone || '', contactPerson: client.contactPerson || '',
      expiryDate: '', isActive: client.isActive,
    })
    setEditNewsEmailAlerts(client.newsEmailAlerts || false)
    setEditNewsSmsAlerts(client.newsSmsAlerts || false)
    setEditNewsKeywords(client.newsKeywords ? client.newsKeywords.split(',').map(k => k.trim()).filter(k => k) : [])
    setEditNewsIndustryId('')
    setEditNewsSelectedSubIndustries([])
    setEditTendersEmailAlerts(client.tenderEmailAlerts || false)
    setEditTendersSmsAlerts(client.tenderSmsAlerts || false)
    setEditTendersKeywords(client.tenderKeywords ? client.tenderKeywords.split(',').map(k => k.trim()).filter(k => k) : [])
    setEditTendersSelectedIndustries([])
    setEditLogoPreview(client.logoUrl || null)
    setEditLogoFile(null)
    setEditConfigTab('news')
    editModal.open(client)
  }

  const handleEditSubmit = async () => {
    if (!editModal.data) return
    setIsSubmitting(true)
    try {
      let logoUrl = editLogoPreview
      if (editLogoFile) logoUrl = await uploadLogo(editLogoFile)
      
      const res = await fetch(`/api/clients/${editModal.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name, email: editFormData.email, phone: editFormData.phoneNumber,
          address: editFormData.physicalAddress, postalAddress: editFormData.postalAddress,
          webAddress: editFormData.webAddress, contactPerson: editFormData.contactPerson,
          expiryDate: editFormData.expiryDate || null, isActive: editFormData.isActive, logoUrl,
          newsEmailAlerts: editNewsEmailAlerts, newsSmsAlerts: editNewsSmsAlerts, newsKeywords: editNewsKeywords.join(', '),
          newsIndustryIds: editNewsSelectedSubIndustries,
          tenderEmailAlerts: editTendersEmailAlerts, tenderSmsAlerts: editTendersSmsAlerts,
          tenderKeywords: editTendersKeywords.join(', '), tenderIndustryIds: editTendersSelectedIndustries,
        }),
      })
      if (res.ok) {
        await fetchClients()
        editModal.close()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns: ColumnDef<Client>[] = [
    { accessorKey: 'name', header: ({ column }) => <DataTableColumnHeader column={column} title="Client Name" />, cell: ({ row }) => <span className="text-blue-600 hover:underline cursor-pointer" onClick={() => handleViewClient(row.original)}>{row.getValue('name')}</span> },
    { id: 'clientUsers', header: 'Client Users', cell: ({ row }) => <Button variant="ghost" size="sm" onClick={() => router.push(`/client-users?clientId=${row.original.id}`)} className="text-gray-600"><Users className="h-4 w-4 mr-1" />{row.original.users ? row.original.users.length : 0}</Button> },
    { accessorKey: 'isActive', header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />, cell: ({ row }) => { const isActive = row.getValue('isActive') as boolean; return <Badge variant="outline" className={isActive ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}>{isActive ? 'Active' : 'Deactivated'}</Badge> } },
    { id: 'toggle', header: '(De)Activate', cell: ({ row }) => <button onClick={() => handleToggleStatus(row.original)} className={`text-sm ${row.original.isActive ? 'text-orange-600 hover:text-orange-700' : 'text-blue-600 hover:text-blue-700'}`}>{row.original.isActive ? 'Deactivate' : 'Re-activate'}</button> },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => handleEditClient(row.original)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(row.original)} className="text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
      </div>
    ) },
  ]

  return (
    <div className="p-6">
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-800">Client Management</h1></div>
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-8">
          <button onClick={() => setActiveTab('list')} className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'list' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            All Clients {activeTab === 'list' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
          </button>
          <button onClick={() => setActiveTab('create')} className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'create' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            Create a New Client {activeTab === 'create' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <DataTable columns={columns} data={clients} isLoading={isLoading} searchPlaceholder="Search clients..." searchColumn="name" />
      ) : (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2"><Label className="text-gray-700">Client Name</Label><Input placeholder="ABC Company" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-gray-700">Email</Label><Input type="email" placeholder="abc@company.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-gray-700">Postal Address</Label><textarea placeholder="Postal Address" value={formData.postalAddress} onChange={(e) => setFormData({ ...formData, postalAddress: e.target.value })} className="w-full h-20 px-3 py-2 rounded-md border border-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" /></div>
              <div className="space-y-2"><Label className="text-gray-700">Physical Address</Label><textarea placeholder="Physical Address" value={formData.physicalAddress} onChange={(e) => setFormData({ ...formData, physicalAddress: e.target.value })} className="w-full h-20 px-3 py-2 rounded-md border border-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" /></div>
              <div className="space-y-2"><Label className="text-gray-700">Web Address</Label><Input placeholder="http://www.company.com" value={formData.webAddress} onChange={(e) => setFormData({ ...formData, webAddress: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-gray-700">Phone Number</Label><Input placeholder="123456789" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-gray-700">Contact Person</Label><Input placeholder="Mr/Ms ABC" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-gray-700">Expiry Date</Label><Input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} /></div>
            </div>
            <div className="mt-6 space-y-4">
              <input ref={logoInputRef} type="file" accept="image/*" onChange={(e) => handleLogoSelect(e)} className="hidden" />
              <div className="flex items-center gap-4">
                <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}><Camera className="h-4 w-4 mr-2" />Client Logo</Button>
                {logoPreview && (
                  <div className="relative">
                    <img src={logoPreview} alt="Logo preview" className="h-12 w-12 object-cover rounded" />
                    <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null) }} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"><X className="h-3 w-3" /></button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2"><Checkbox id="active" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })} /><Label htmlFor="active" className="cursor-pointer">Active</Label></div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-700 mb-4">Configure Updates</h3>
            <div className="border-b border-gray-200 mb-4">
              <div className="flex">
                <button type="button" onClick={() => setConfigTab('news')} className={`px-4 py-2 text-sm font-medium border-b-2 ${configTab === 'news' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>News</button>
                <button type="button" onClick={() => setConfigTab('tenders')} className={`px-4 py-2 text-sm font-medium border-b-2 ${configTab === 'tenders' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Tenders</button>
              </div>
            </div>

            {configTab === 'news' && (
              <div className="space-y-4">
                <div className="flex gap-8">
                  <div className="flex items-center gap-2"><Checkbox id="newsEmail" checked={newsEmailAlerts} onCheckedChange={(c) => setNewsEmailAlerts(!!c)} /><Label htmlFor="newsEmail" className="text-sm cursor-pointer">Email Alerts</Label></div>
                  <div className="flex items-center gap-2"><Checkbox id="newsSms" checked={newsSmsAlerts} onCheckedChange={(c) => setNewsSmsAlerts(!!c)} /><Label htmlFor="newsSms" className="text-sm cursor-pointer">SMS Alerts</Label></div>
                </div>
                <div><Label className="text-gray-700">Keywords</Label><KeywordTagInput keywords={newsKeywords} onChange={setNewsKeywords} /></div>
                <div><Label className="text-gray-700">Industry</Label>
                  <select className="w-full h-10 mt-1 rounded-md border border-gray-300 px-3 bg-white max-w-md" value={newsIndustryId} onChange={(e) => { setNewsIndustryId(e.target.value); setNewsSelectedSubIndustries([]) }}>
                    <option value="">Select Industry</option>
                    {industries.map(ind => <option key={ind.id} value={ind.id}>{ind.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-600 text-center block mb-3">Available Sub-industries</Label>
                    <div className="border border-gray-200 rounded-lg h-48 overflow-y-auto bg-gray-50">
                      {availableSubIndustries.length === 0 ? (<p className="text-gray-400 text-sm text-center py-4">No more sub-industries</p>) : (
                        availableSubIndustries.map(s => (<div key={s.id} className="px-4 py-3 hover:bg-white cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0 transition-colors" onClick={() => setNewsSelectedSubIndustries([...newsSelectedSubIndustries, s.id])}><span className="text-gray-700">{s.name}</span><ChevronRight className="h-4 w-4 text-gray-400" /></div>))
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-center block mb-3">Selected Sub-industries</Label>
                    <div className="border border-gray-200 rounded-lg h-48 overflow-y-auto bg-orange-50">
                      {newsSelectedSubIndustries.length === 0 ? (<p className="text-gray-400 text-sm text-center py-4">Click to add sub-industries</p>) : (
                        newsSelectedSubIndustries.map(id => {
                          const sub = selectedIndustry?.subIndustries.find(s => s.id === id)
                          return (<div key={id} className="px-4 py-3 hover:bg-orange-100 cursor-pointer flex justify-between items-center border-b border-orange-100 last:border-0 transition-colors" onClick={() => setNewsSelectedSubIndustries(newsSelectedSubIndustries.filter(x => x !== id))}><ChevronLeft className="h-4 w-4 text-orange-400" /><span className="text-gray-700">{sub?.name || id}</span></div>)
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {configTab === 'tenders' && (
              <div className="space-y-4">
                <div className="flex gap-8">
                  <div className="flex items-center gap-2"><Checkbox id="tendersEmail" checked={tendersEmailAlerts} onCheckedChange={(c) => setTendersEmailAlerts(!!c)} /><Label htmlFor="tendersEmail" className="text-sm cursor-pointer">Email Alerts</Label></div>
                  <div className="flex items-center gap-2"><Checkbox id="tendersSms" checked={tendersSmsAlerts} onCheckedChange={(c) => setTendersSmsAlerts(!!c)} /><Label htmlFor="tendersSms" className="text-sm cursor-pointer">SMS Alerts</Label></div>
                </div>
                <div><Label className="text-gray-700">Keywords</Label><KeywordTagInput keywords={tendersKeywords} onChange={setTendersKeywords} /></div>
                <div>
                  <h4 className="text-lg font-medium text-gray-700 mb-4">Industries</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-600 text-center block mb-3">Available Industries</Label>
                      <div className="border border-gray-200 rounded-lg h-48 overflow-y-auto bg-gray-50">
                        {availableIndustries.length === 0 ? (<p className="text-gray-400 text-sm text-center py-4">No more industries</p>) : (
                          availableIndustries.map(ind => (<div key={ind.id} className="px-4 py-3 hover:bg-white cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0 transition-colors" onClick={() => setTendersSelectedIndustries([...tendersSelectedIndustries, ind.id])}><span className="text-gray-700">{ind.name}</span><ChevronRight className="h-4 w-4 text-gray-400" /></div>))
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-600 text-center block mb-3">Selected Industries</Label>
                      <div className="border border-gray-200 rounded-lg h-48 overflow-y-auto bg-orange-50">
                        {tendersSelectedIndustries.length === 0 ? (<p className="text-gray-400 text-sm text-center py-4">Click to add industries</p>) : (
                          tendersSelectedIndustries.map(id => {
                            const ind = industries.find(i => i.id === id)
                            return (<div key={id} className="px-4 py-3 hover:bg-orange-100 cursor-pointer flex justify-between items-center border-b border-orange-100 last:border-0 transition-colors" onClick={() => setTendersSelectedIndustries(tendersSelectedIndustries.filter(x => x !== id))}><ChevronLeft className="h-4 w-4 text-orange-400" /><span className="text-gray-700">{ind?.name || id}</span></div>)
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button onClick={handleCreateSubmit} disabled={!formData.name || !formData.email || isSubmitting} className="bg-gray-400 hover:bg-gray-500 text-white px-8">
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDeleteConfirm} title="Delete Client" description={`Are you sure you want to delete ${deleteModal.data?.name}?`} confirmLabel="Delete" variant="destructive" />
      <PasswordConfirmModal isOpen={passwordModal.isOpen} onClose={() => { passwordModal.close(); setPendingAction(null) }} onConfirm={handlePasswordConfirm} title="Confirm Action" description="Please enter your password to authorize this action." actionLabel={pendingAction?.type === 'create' ? 'Create Client' : pendingAction?.type === 'toggle' ? 'Confirm' : 'Delete Client'} />
      
      <ViewModal isOpen={viewModal.isOpen} onClose={viewModal.close} title={viewModal.data?.name || 'Client Details'} subtitle="Client Information" icon={<Building2 className="h-6 w-6" />} actions={<Button onClick={() => { viewModal.close(); if (viewModal.data) handleEditClient(viewModal.data) }} className="bg-orange-500 hover:bg-orange-600 text-white"><Pencil className="h-4 w-4 mr-2" />Edit</Button>}>
        {viewModal.data && (
          <div className="space-y-4">
            {viewModal.data.logoUrl && <img src={viewModal.data.logoUrl} alt="Client logo" className="h-16 w-16 object-cover rounded" />}
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-gray-500 text-sm">Email</Label><p className="text-gray-900">{viewModal.data.contactEmail || '-'}</p></div>
              <div><Label className="text-gray-500 text-sm">Phone</Label><p className="text-gray-900">{viewModal.data.contactPhone || '-'}</p></div>
              <div><Label className="text-gray-500 text-sm">Status</Label><Badge variant="outline" className={viewModal.data.isActive ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}>{viewModal.data.isActive ? 'Active' : 'Inactive'}</Badge></div>
              <div><Label className="text-gray-500 text-sm">Created</Label><p className="text-gray-900">{viewModal.data.createdAt.toLocaleDateString()}</p></div>
            </div>
            <div><Label className="text-gray-500 text-sm">Address</Label><p className="text-gray-900">{viewModal.data.address || '-'}</p></div>
          </div>
        )}
      </ViewModal>

      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit Client" description="Update client information" icon={<Building2 className="h-6 w-6" />} onSubmit={handleEditSubmit} isSubmitting={isSubmitting} submitLabel="Save Changes" size="xl">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-gray-700">Client Name</Label><Input placeholder="ABC Company" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-gray-700">Email</Label><Input type="email" placeholder="abc@company.com" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-gray-700">Postal Address</Label><textarea placeholder="Postal Address" value={editFormData.postalAddress} onChange={(e) => setEditFormData({ ...editFormData, postalAddress: e.target.value })} className="w-full h-20 px-3 py-2 rounded-md border border-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" /></div>
            <div className="space-y-2"><Label className="text-gray-700">Physical Address</Label><textarea placeholder="Physical Address" value={editFormData.physicalAddress} onChange={(e) => setEditFormData({ ...editFormData, physicalAddress: e.target.value })} className="w-full h-20 px-3 py-2 rounded-md border border-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" /></div>
            <div className="space-y-2"><Label className="text-gray-700">Web Address</Label><Input placeholder="http://www.company.com" value={editFormData.webAddress} onChange={(e) => setEditFormData({ ...editFormData, webAddress: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-gray-700">Phone Number</Label><Input placeholder="123456789" value={editFormData.phoneNumber} onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-gray-700">Contact Person</Label><Input placeholder="Mr/Ms ABC" value={editFormData.contactPerson} onChange={(e) => setEditFormData({ ...editFormData, contactPerson: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-gray-700">Expiry Date</Label><Input type="date" value={editFormData.expiryDate} onChange={(e) => setEditFormData({ ...editFormData, expiryDate: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-4">
            <input ref={editLogoInputRef} type="file" accept="image/*" onChange={(e) => handleLogoSelect(e, true)} className="hidden" />
            <Button type="button" variant="outline" onClick={() => editLogoInputRef.current?.click()}><Camera className="h-4 w-4 mr-2" />Client Logo</Button>
            {editLogoPreview && (
              <div className="relative">
                <img src={editLogoPreview} alt="Logo preview" className="h-12 w-12 object-cover rounded" />
                <button type="button" onClick={() => { setEditLogoFile(null); setEditLogoPreview(null) }} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"><X className="h-3 w-3" /></button>
              </div>
            )}
            <div className="flex items-center gap-2"><Checkbox id="editActive" checked={editFormData.isActive} onCheckedChange={(checked) => setEditFormData({ ...editFormData, isActive: checked as boolean })} /><Label htmlFor="editActive" className="cursor-pointer">Active</Label></div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-700 mb-4">Configure Updates</h3>
            <div className="border-b border-gray-200 mb-4">
              <div className="flex">
                <button type="button" onClick={() => setEditConfigTab('news')} className={`px-4 py-2 text-sm font-medium border-b-2 ${editConfigTab === 'news' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>News</button>
                <button type="button" onClick={() => setEditConfigTab('tenders')} className={`px-4 py-2 text-sm font-medium border-b-2 ${editConfigTab === 'tenders' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Tenders</button>
              </div>
            </div>

            {editConfigTab === 'news' && (
              <div className="space-y-4">
                <div className="flex gap-8">
                  <div className="flex items-center gap-2"><Checkbox id="editNewsEmail" checked={editNewsEmailAlerts} onCheckedChange={(c) => setEditNewsEmailAlerts(!!c)} /><Label htmlFor="editNewsEmail" className="text-sm cursor-pointer">Email Alerts</Label></div>
                  <div className="flex items-center gap-2"><Checkbox id="editNewsSms" checked={editNewsSmsAlerts} onCheckedChange={(c) => setEditNewsSmsAlerts(!!c)} /><Label htmlFor="editNewsSms" className="text-sm cursor-pointer">SMS Alerts</Label></div>
                </div>
                <div><Label className="text-gray-700">Keywords</Label><KeywordTagInput keywords={editNewsKeywords} onChange={setEditNewsKeywords} /></div>
                <div><Label className="text-gray-700">Industry</Label>
                  <select className="w-full h-10 mt-1 rounded-md border border-gray-300 px-3 bg-white" value={editNewsIndustryId} onChange={(e) => { setEditNewsIndustryId(e.target.value); setEditNewsSelectedSubIndustries([]) }}>
                    <option value="">Select Industry</option>
                    {industries.map(ind => <option key={ind.id} value={ind.id}>{ind.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600 text-center block mb-2 text-sm">Available Sub-industries</Label>
                    <div className="border border-gray-200 rounded-lg h-32 overflow-y-auto bg-gray-50">
                      {editAvailableSubIndustries.length === 0 ? (<p className="text-gray-400 text-sm text-center py-4">No sub-industries</p>) : (
                        editAvailableSubIndustries.map(s => (<div key={s.id} className="px-3 py-2 hover:bg-white cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0 text-sm" onClick={() => setEditNewsSelectedSubIndustries([...editNewsSelectedSubIndustries, s.id])}><span className="text-gray-700">{s.name}</span><ChevronRight className="h-3 w-3 text-gray-400" /></div>))
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-center block mb-2 text-sm">Selected Sub-industries</Label>
                    <div className="border border-gray-200 rounded-lg h-32 overflow-y-auto bg-orange-50">
                      {editNewsSelectedSubIndustries.length === 0 ? (<p className="text-gray-400 text-sm text-center py-4">Click to add</p>) : (
                        editNewsSelectedSubIndustries.map(id => {
                          const sub = editSelectedIndustry?.subIndustries.find(s => s.id === id)
                          return (<div key={id} className="px-3 py-2 hover:bg-orange-100 cursor-pointer flex justify-between items-center border-b border-orange-100 last:border-0 text-sm" onClick={() => setEditNewsSelectedSubIndustries(editNewsSelectedSubIndustries.filter(x => x !== id))}><ChevronLeft className="h-3 w-3 text-orange-400" /><span className="text-gray-700">{sub?.name || id}</span></div>)
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {editConfigTab === 'tenders' && (
              <div className="space-y-4">
                <div className="flex gap-8">
                  <div className="flex items-center gap-2"><Checkbox id="editTendersEmail" checked={editTendersEmailAlerts} onCheckedChange={(c) => setEditTendersEmailAlerts(!!c)} /><Label htmlFor="editTendersEmail" className="text-sm cursor-pointer">Email Alerts</Label></div>
                  <div className="flex items-center gap-2"><Checkbox id="editTendersSms" checked={editTendersSmsAlerts} onCheckedChange={(c) => setEditTendersSmsAlerts(!!c)} /><Label htmlFor="editTendersSms" className="text-sm cursor-pointer">SMS Alerts</Label></div>
                </div>
                <div><Label className="text-gray-700">Keywords</Label><KeywordTagInput keywords={editTendersKeywords} onChange={setEditTendersKeywords} /></div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Industries</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-600 text-center block mb-2 text-sm">Available Industries</Label>
                      <div className="border border-gray-200 rounded-lg h-32 overflow-y-auto bg-gray-50">
                        {editAvailableIndustries.length === 0 ? (<p className="text-gray-400 text-sm text-center py-4">No industries</p>) : (
                          editAvailableIndustries.map(ind => (<div key={ind.id} className="px-3 py-2 hover:bg-white cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0 text-sm" onClick={() => setEditTendersSelectedIndustries([...editTendersSelectedIndustries, ind.id])}><span className="text-gray-700 truncate">{ind.name}</span><ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" /></div>))
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-600 text-center block mb-2 text-sm">Selected Industries</Label>
                      <div className="border border-gray-200 rounded-lg h-32 overflow-y-auto bg-orange-50">
                        {editTendersSelectedIndustries.length === 0 ? (<p className="text-gray-400 text-sm text-center py-4">Click to add</p>) : (
                          editTendersSelectedIndustries.map(id => {
                            const ind = industries.find(i => i.id === id)
                            return (<div key={id} className="px-3 py-2 hover:bg-orange-100 cursor-pointer flex justify-between items-center border-b border-orange-100 last:border-0 text-sm" onClick={() => setEditTendersSelectedIndustries(editTendersSelectedIndustries.filter(x => x !== id))}><ChevronLeft className="h-3 w-3 text-orange-400 flex-shrink-0" /><span className="text-gray-700 truncate">{ind?.name || id}</span></div>)
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </FormModal>
    </div>
  )
}
