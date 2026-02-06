'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog, PasswordConfirmModal, ViewModal, FormModal } from '@/components/modals'
import { useModal } from '@/hooks/use-modal'
import { Client } from '@/types/client'
import { Trash2, Users, Calendar, Camera, Pencil, ChevronRight, ChevronLeft, Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const mockClients: Client[] = [
  { id: '1', name: 'TechVision Solutions', contactEmail: 'contact@techvision.com', contactPhone: '+1234567890', newsUpdateConfig: { enabled: true, frequency: 'daily', industries: ['tech'] }, tenderUpdateConfig: { enabled: true, frequency: 'weekly', industries: ['tech'] }, isActive: true, createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
  { id: '2', name: 'Global Finance Corp', contactEmail: 'info@globalfinance.com', newsUpdateConfig: { enabled: true, frequency: 'realtime', industries: ['banking'] }, tenderUpdateConfig: { enabled: false, frequency: 'daily', industries: [] }, isActive: true, createdAt: new Date('2024-02-01'), updatedAt: new Date('2024-02-01') },
  { id: '3', name: 'MediCare Health', contactEmail: 'info@medicare.com', newsUpdateConfig: { enabled: true, frequency: 'daily', industries: ['healthcare'] }, tenderUpdateConfig: { enabled: true, frequency: 'daily', industries: ['healthcare'] }, isActive: false, createdAt: new Date('2024-02-15'), updatedAt: new Date('2024-02-15') },
  { id: '4', name: 'EcoEnergy Ltd', contactEmail: 'contact@ecoenergy.com', newsUpdateConfig: { enabled: true, frequency: 'weekly', industries: ['energy'] }, tenderUpdateConfig: { enabled: true, frequency: 'weekly', industries: ['energy'] }, isActive: true, createdAt: new Date('2024-03-01'), updatedAt: new Date('2024-03-01') },
  { id: '5', name: 'Urban Builders Inc', contactEmail: 'info@urbanbuilders.com', newsUpdateConfig: { enabled: false, frequency: 'daily', industries: [] }, tenderUpdateConfig: { enabled: true, frequency: 'daily', industries: ['construction'] }, isActive: true, createdAt: new Date('2024-03-10'), updatedAt: new Date('2024-03-10') },
]

const industries = [
  'Agriculture, Food & Beverages', 'Automobile', 'Aviation', 'Banking, Financial Services & Insurance',
  'Consulting', 'Education & Training', 'Energy, Power & Electricity', 'Healthcare & Pharmaceuticals',
  'Information Technology', 'Manufacturing', 'Media & Entertainment', 'Real Estate & Construction',
  'Retail & Consumer Goods', 'Telecommunications', 'Transportation & Logistics',
]

const subIndustriesMap: Record<string, string[]> = {
  'Information Technology': ['Software', 'Hardware', 'AI/ML', 'Cybersecurity', 'Cloud Computing'],
  'Banking, Financial Services & Insurance': ['Banking', 'Insurance', 'Investment', 'Fintech'],
  'Healthcare & Pharmaceuticals': ['Pharmaceuticals', 'Medical Devices', 'Hospitals', 'Biotech'],
}

type TabType = 'list' | 'create'
type ConfigTab = 'news' | 'tenders'

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>(mockClients)
  const [activeTab, setActiveTab] = useState<TabType>('list')
  const [configTab, setConfigTab] = useState<ConfigTab>('news')
  const [isLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '', email: '', postalAddress: '', physicalAddress: '', webAddress: '',
    phoneNumber: '', contactPerson: '', expiryDate: '', isActive: false,
  })

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
  const [editNewsKeywords, setEditNewsKeywords] = useState('')
  const [editNewsIndustryId, setEditNewsIndustryId] = useState('')
  const [editNewsSelectedSubIndustries, setEditNewsSelectedSubIndustries] = useState<string[]>([])
  const [editTendersEmailAlerts, setEditTendersEmailAlerts] = useState(false)
  const [editTendersSmsAlerts, setEditTendersSmsAlerts] = useState(false)
  const [editTendersKeywords, setEditTendersKeywords] = useState('')
  const [editTendersSelectedIndustries, setEditTendersSelectedIndustries] = useState<string[]>([])

  const editAvailableSubIndustries = editNewsIndustryId ? (subIndustriesMap[editNewsIndustryId] || []).filter(s => !editNewsSelectedSubIndustries.includes(s)) : []
  const editAvailableIndustries = industries.filter(i => !editTendersSelectedIndustries.includes(i))

  const availableSubIndustries = newsIndustryId ? (subIndustriesMap[newsIndustryId] || []).filter(s => !newsSelectedSubIndustries.includes(s)) : []
  const availableIndustries = industries.filter(i => !tendersSelectedIndustries.includes(i))

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
    if (pendingAction?.type === 'create') {
      const data = pendingAction.data as typeof formData
      const newClient: Client = {
        id: String(Date.now()), name: data.name, contactEmail: data.email, contactPhone: data.phoneNumber,
        address: data.physicalAddress, newsUpdateConfig: { enabled: newsEmailAlerts || newsSmsAlerts, frequency: 'daily', industries: newsSelectedSubIndustries },
        tenderUpdateConfig: { enabled: tendersEmailAlerts || tendersSmsAlerts, frequency: 'daily', industries: tendersSelectedIndustries },
        isActive: data.isActive, createdAt: new Date(), updatedAt: new Date(),
      }
      setClients([...clients, newClient])
      setFormData({ name: '', email: '', postalAddress: '', physicalAddress: '', webAddress: '', phoneNumber: '', contactPerson: '', expiryDate: '', isActive: false })
      setActiveTab('list')
    } else if (pendingAction?.type === 'delete') {
      setClients(clients.filter(c => c.id !== (pendingAction.data as Client).id))
    } else if (pendingAction?.type === 'toggle') {
      const client = pendingAction.data as Client
      setClients(clients.map(c => c.id === client.id ? { ...c, isActive: !c.isActive } : c))
    }
    setPendingAction(null)
  }

  const handleDeleteClick = (client: Client) => deleteModal.open(client)
  const handleDeleteConfirm = () => { setPendingAction({ type: 'delete', data: deleteModal.data! }); deleteModal.close(); passwordModal.open() }
  const handleToggleStatus = (client: Client) => { setPendingAction({ type: 'toggle', data: client }); passwordModal.open() }
  const handleViewClient = (client: Client) => viewModal.open(client)
  const handleEditClient = (client: Client) => {
    setEditFormData({
      name: client.name,
      email: client.contactEmail || '',
      postalAddress: '',
      physicalAddress: client.address || '',
      webAddress: '',
      phoneNumber: client.contactPhone || '',
      contactPerson: '',
      expiryDate: '',
      isActive: client.isActive,
    })
    setEditNewsEmailAlerts(client.newsUpdateConfig?.enabled || false)
    setEditNewsSmsAlerts(false)
    setEditNewsKeywords('')
    setEditNewsIndustryId('')
    setEditNewsSelectedSubIndustries(client.newsUpdateConfig?.industries || [])
    setEditTendersEmailAlerts(client.tenderUpdateConfig?.enabled || false)
    setEditTendersSmsAlerts(false)
    setEditTendersKeywords('')
    setEditTendersSelectedIndustries(client.tenderUpdateConfig?.industries || [])
    setEditConfigTab('news')
    editModal.open(client)
  }
  const handleEditSubmit = async () => {
    if (editModal.data) {
      setClients(clients.map(c => c.id === editModal.data!.id ? {
        ...c,
        name: editFormData.name,
        contactEmail: editFormData.email,
        contactPhone: editFormData.phoneNumber,
        address: editFormData.physicalAddress,
        isActive: editFormData.isActive,
        newsUpdateConfig: { enabled: editNewsEmailAlerts || editNewsSmsAlerts, frequency: 'daily', industries: editNewsSelectedSubIndustries },
        tenderUpdateConfig: { enabled: editTendersEmailAlerts || editTendersSmsAlerts, frequency: 'daily', industries: editTendersSelectedIndustries },
        updatedAt: new Date(),
      } : c))
      editModal.close()
    }
  }

  const columns: ColumnDef<Client>[] = [
    { accessorKey: 'name', header: ({ column }) => <DataTableColumnHeader column={column} title="Client Name" />, cell: ({ row }) => <span className="text-blue-600 hover:underline cursor-pointer" onClick={() => handleViewClient(row.original)}>{row.getValue('name')}</span> },
    { id: 'clientUsers', header: 'Client Users', cell: ({ row }) => <Button variant="ghost" size="sm" onClick={() => router.push(`/client-users?clientId=${row.original.id}`)} className="text-gray-600"><Users className="h-4 w-4 mr-1" />{Math.floor(Math.random() * 10) + 1}</Button> },
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
          {/* Client Details Form */}
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
              <Button variant="outline"><Camera className="h-4 w-4 mr-2" />Client Logo</Button>
              <div className="flex items-center gap-2"><Checkbox id="active" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })} /><Label htmlFor="active" className="cursor-pointer">Active</Label></div>
            </div>
          </div>

          {/* Configure Updates Section */}
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
                  <div className="flex items-center gap-2"><Checkbox id="newsEmail" checked={newsEmailAlerts} onCheckedChange={(c) => setNewsEmailAlerts(!!c)} /><Label htmlFor="newsEmail" className="text-sm">Email Alerts</Label></div>
                  <div className="flex items-center gap-2"><Checkbox id="newsSms" checked={newsSmsAlerts} onCheckedChange={(c) => setNewsSmsAlerts(!!c)} /><Label htmlFor="newsSms" className="text-sm">SMS Alerts</Label></div>
                </div>
                <div><Label className="text-gray-700">Keywords</Label><textarea className="w-full min-h-[80px] mt-1 rounded-md border border-gray-300 p-3 resize-y" value={newsKeywords} onChange={(e) => setNewsKeywords(e.target.value)} placeholder="keywords" /></div>
                <div><Label className="text-gray-700">Industry</Label>
                  <select className="w-full h-10 mt-1 rounded-md border border-gray-300 px-3 bg-white max-w-md" value={newsIndustryId} onChange={(e) => { setNewsIndustryId(e.target.value); setNewsSelectedSubIndustries([]) }}>
                    <option value="">Select Industry</option>
                    {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
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

            {configTab === 'tenders' && (
              <div className="space-y-4">
                <div className="flex gap-8">
                  <div className="flex items-center gap-2"><Checkbox id="tendersEmail" checked={tendersEmailAlerts} onCheckedChange={(c) => setTendersEmailAlerts(!!c)} /><Label htmlFor="tendersEmail" className="text-sm">Email Alerts</Label></div>
                  <div className="flex items-center gap-2"><Checkbox id="tendersSms" checked={tendersSmsAlerts} onCheckedChange={(c) => setTendersSmsAlerts(!!c)} /><Label htmlFor="tendersSms" className="text-sm">SMS Alerts</Label></div>
                </div>
                <div><Label className="text-gray-700">Keywords</Label><textarea className="w-full min-h-[80px] mt-1 rounded-md border border-gray-300 p-3 resize-y" value={tendersKeywords} onChange={(e) => setTendersKeywords(e.target.value)} placeholder="keywords" /></div>
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

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button onClick={handleCreateSubmit} disabled={!formData.name || !formData.email} className="bg-gray-400 hover:bg-gray-500 text-white px-8">Save Changes</Button>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDeleteConfirm} title="Delete Client" description={`Are you sure you want to delete ${deleteModal.data?.name}?`} confirmLabel="Delete" variant="destructive" />
      <PasswordConfirmModal isOpen={passwordModal.isOpen} onClose={() => { passwordModal.close(); setPendingAction(null) }} onConfirm={handlePasswordConfirm} title="Confirm Action" description="Please enter your password to authorize this action." actionLabel={pendingAction?.type === 'create' ? 'Create Client' : pendingAction?.type === 'toggle' ? 'Confirm' : 'Delete Client'} />
      
      <ViewModal isOpen={viewModal.isOpen} onClose={viewModal.close} title={viewModal.data?.name || 'Client Details'} subtitle="Client Information" icon={<Building2 className="h-6 w-6" />} actions={<Button onClick={() => { viewModal.close(); if (viewModal.data) handleEditClient(viewModal.data) }} className="bg-orange-500 hover:bg-orange-600 text-white"><Pencil className="h-4 w-4 mr-2" />Edit</Button>}>
        {viewModal.data && (
          <div className="space-y-4">
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

      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit Client" description="Update client information" icon={<Building2 className="h-6 w-6" />} onSubmit={handleEditSubmit} isSubmitting={false} submitLabel="Save Changes" size="xl">
        <div className="space-y-6">
          {/* Client Details */}
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
            <Button type="button" variant="outline"><Camera className="h-4 w-4 mr-2" />Client Logo</Button>
            <div className="flex items-center gap-2"><Checkbox id="editActive" checked={editFormData.isActive} onCheckedChange={(checked) => setEditFormData({ ...editFormData, isActive: checked as boolean })} /><Label htmlFor="editActive" className="cursor-pointer">Active</Label></div>
          </div>

          {/* Configure Updates */}
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
                  <div className="flex items-center gap-2"><Checkbox id="editNewsEmail" checked={editNewsEmailAlerts} onCheckedChange={(c) => setEditNewsEmailAlerts(!!c)} /><Label htmlFor="editNewsEmail" className="text-sm">Email Alerts</Label></div>
                  <div className="flex items-center gap-2"><Checkbox id="editNewsSms" checked={editNewsSmsAlerts} onCheckedChange={(c) => setEditNewsSmsAlerts(!!c)} /><Label htmlFor="editNewsSms" className="text-sm">SMS Alerts</Label></div>
                </div>
                <div><Label className="text-gray-700">Keywords</Label><textarea className="w-full min-h-[60px] mt-1 rounded-md border border-gray-300 p-3 resize-y" value={editNewsKeywords} onChange={(e) => setEditNewsKeywords(e.target.value)} placeholder="keywords" /></div>
                <div><Label className="text-gray-700">Industry</Label>
                  <select className="w-full h-10 mt-1 rounded-md border border-gray-300 px-3 bg-white" value={editNewsIndustryId} onChange={(e) => { setEditNewsIndustryId(e.target.value); setEditNewsSelectedSubIndustries([]) }}>
                    <option value="">Select Industry</option>
                    {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600 text-center block mb-2 text-sm">Available Sub-industries</Label>
                    <div className="border border-gray-200 rounded-lg h-32 overflow-y-auto bg-gray-50">
                      {editAvailableSubIndustries.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">No sub-industries</p>
                      ) : (
                        editAvailableSubIndustries.map(s => (
                          <div key={s} className="px-3 py-2 hover:bg-white cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0 text-sm" onClick={() => setEditNewsSelectedSubIndustries([...editNewsSelectedSubIndustries, s])}>
                            <span className="text-gray-700">{s}</span>
                            <ChevronRight className="h-3 w-3 text-gray-400" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-center block mb-2 text-sm">Selected Sub-industries</Label>
                    <div className="border border-gray-200 rounded-lg h-32 overflow-y-auto bg-orange-50">
                      {editNewsSelectedSubIndustries.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">Click to add</p>
                      ) : (
                        editNewsSelectedSubIndustries.map(s => (
                          <div key={s} className="px-3 py-2 hover:bg-orange-100 cursor-pointer flex justify-between items-center border-b border-orange-100 last:border-0 text-sm" onClick={() => setEditNewsSelectedSubIndustries(editNewsSelectedSubIndustries.filter(x => x !== s))}>
                            <ChevronLeft className="h-3 w-3 text-orange-400" />
                            <span className="text-gray-700">{s}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {editConfigTab === 'tenders' && (
              <div className="space-y-4">
                <div className="flex gap-8">
                  <div className="flex items-center gap-2"><Checkbox id="editTendersEmail" checked={editTendersEmailAlerts} onCheckedChange={(c) => setEditTendersEmailAlerts(!!c)} /><Label htmlFor="editTendersEmail" className="text-sm">Email Alerts</Label></div>
                  <div className="flex items-center gap-2"><Checkbox id="editTendersSms" checked={editTendersSmsAlerts} onCheckedChange={(c) => setEditTendersSmsAlerts(!!c)} /><Label htmlFor="editTendersSms" className="text-sm">SMS Alerts</Label></div>
                </div>
                <div><Label className="text-gray-700">Keywords</Label><textarea className="w-full min-h-[60px] mt-1 rounded-md border border-gray-300 p-3 resize-y" value={editTendersKeywords} onChange={(e) => setEditTendersKeywords(e.target.value)} placeholder="keywords" /></div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Industries</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-600 text-center block mb-2 text-sm">Available Industries</Label>
                      <div className="border border-gray-200 rounded-lg h-32 overflow-y-auto bg-gray-50">
                        {editAvailableIndustries.length === 0 ? (
                          <p className="text-gray-400 text-sm text-center py-4">No industries</p>
                        ) : (
                          editAvailableIndustries.map(ind => (
                            <div key={ind} className="px-3 py-2 hover:bg-white cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0 text-sm" onClick={() => setEditTendersSelectedIndustries([...editTendersSelectedIndustries, ind])}>
                              <span className="text-gray-700 truncate">{ind}</span>
                              <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-600 text-center block mb-2 text-sm">Selected Industries</Label>
                      <div className="border border-gray-200 rounded-lg h-32 overflow-y-auto bg-orange-50">
                        {editTendersSelectedIndustries.length === 0 ? (
                          <p className="text-gray-400 text-sm text-center py-4">Click to add</p>
                        ) : (
                          editTendersSelectedIndustries.map(ind => (
                            <div key={ind} className="px-3 py-2 hover:bg-orange-100 cursor-pointer flex justify-between items-center border-b border-orange-100 last:border-0 text-sm" onClick={() => setEditTendersSelectedIndustries(editTendersSelectedIndustries.filter(x => x !== ind))}>
                              <ChevronLeft className="h-3 w-3 text-orange-400 flex-shrink-0" />
                              <span className="text-gray-700 truncate">{ind}</span>
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
        </div>
      </FormModal>
    </div>
  )
}
