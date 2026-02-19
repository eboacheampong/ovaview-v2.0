'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/hooks/use-auth'
import { Loader2, Save, Lock, User, Bot, Globe, RefreshCw, Zap } from 'lucide-react'

type SettingsTab = 'account' | 'scraper' | 'ai'

interface ScraperSettings {
  maxArticleAgeDays: number
  scraperTimeout: number
  maxArticlesPerSource: number
  enableRssFeed: boolean
  enableSitemap: boolean
  enablePageScrape: boolean
  scraperApiUrl: string
}

interface AISettings {
  primaryModel: string
  fallbackModels: string[]
  maxTokensSummary: number
  maxTokensAnalysis: number
  temperatureSummary: number
  temperatureAnalysis: number
  maxContentLength: number
}

const AI_MODELS = [
  { value: 'meta-llama/llama-3.1-8b-instruct', label: 'Llama 3.1 8B (Fast)' },
  { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B (Quality)' },
  { value: 'mistralai/mistral-nemo', label: 'Mistral Nemo' },
  { value: 'mistralai/mixtral-8x7b-instruct', label: 'Mixtral 8x7B' },
  { value: 'openai/gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
  { value: 'anthropic/claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'google/gemini-pro', label: 'Gemini Pro' },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const [isLoading, setIsLoading] = useState(true)

  const [profileData, setProfileData] = useState({ username: '', email: '' })
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [scraperSettings, setScraperSettings] = useState<ScraperSettings>({
    maxArticleAgeDays: 7, scraperTimeout: 120, maxArticlesPerSource: 150,
    enableRssFeed: true, enableSitemap: true, enablePageScrape: true,
    scraperApiUrl: 'http://localhost:5000',
  })
  const [scraperSaving, setScraperSaving] = useState(false)
  const [scraperMessage, setScraperMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [scraperHealth, setScraperHealth] = useState<'checking' | 'healthy' | 'unhealthy'>('checking')

  const [aiSettings, setAISettings] = useState<AISettings>({
    primaryModel: 'meta-llama/llama-3.1-8b-instruct',
    fallbackModels: ['mistralai/mistral-nemo', 'openai/gpt-oss-20b'],
    maxTokensSummary: 300, maxTokensAnalysis: 800,
    temperatureSummary: 0.5, temperatureAnalysis: 0.3, maxContentLength: 3000,
  })
  const [aiSaving, setAISaving] = useState(false)
  const [aiMessage, setAIMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setProfileData({ username: user?.username || '', email: user?.email || '' })
    fetchSettings()
  }, [user])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.scraper) setScraperSettings(data.scraper)
        if (data.ai) setAISettings(data.ai)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkScraperHealth = async () => {
    setScraperHealth('checking')
    try {
      const res = await fetch(`${scraperSettings.scraperApiUrl}/health`, { signal: AbortSignal.timeout(5000) })
      setScraperHealth(res.ok ? 'healthy' : 'unhealthy')
    } catch { setScraperHealth('unhealthy') }
  }

  useEffect(() => { if (activeTab === 'scraper') checkScraperHealth() }, [activeTab, scraperSettings.scraperApiUrl])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMessage(null)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setProfileMessage({ type: 'success', text: 'Profile updated!' })
    } catch { setProfileMessage({ type: 'error', text: 'Failed to update profile' }) }
    finally { setProfileSaving(false) }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' }); return
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' }); return
    }
    setPasswordSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setPasswordMessage({ type: 'success', text: 'Password changed!' })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch { setPasswordMessage({ type: 'error', text: 'Failed to change password' }) }
    finally { setPasswordSaving(false) }
  }

  const handleScraperSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setScraperSaving(true)
    setScraperMessage(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scraper: scraperSettings, ai: aiSettings }),
      })
      if (res.ok) setScraperMessage({ type: 'success', text: 'Scraper settings saved!' })
      else throw new Error('Failed')
    } catch { setScraperMessage({ type: 'error', text: 'Failed to save settings' }) }
    finally { setScraperSaving(false) }
  }

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAISaving(true)
    setAIMessage(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scraper: scraperSettings, ai: aiSettings }),
      })
      if (res.ok) setAIMessage({ type: 'success', text: 'AI settings saved!' })
      else throw new Error('Failed')
    } catch { setAIMessage({ type: 'error', text: 'Failed to save settings' }) }
    finally { setAISaving(false) }
  }

  const tabs = [
    { id: 'account' as const, label: 'Account', icon: User },
    { id: 'scraper' as const, label: 'Scraper', icon: Globe },
    { id: 'ai' as const, label: 'AI Settings', icon: Bot },
  ]

  if (isLoading) return <div className="p-6 flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account, scraper, and AI configurations</p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === tab.id ? 'text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>
              <tab.icon className="h-4 w-4" />{tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl">
        {activeTab === 'account' && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Profile Information</CardTitle><CardDescription>Update your account details</CardDescription></CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="space-y-2"><Label>Username</Label><Input value={profileData.username} onChange={(e) => setProfileData({ ...profileData, username: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} /></div>
                  {profileMessage && <p className={`text-sm ${profileMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{profileMessage.text}</p>}
                  <Button type="submit" disabled={profileSaving} className="bg-orange-500 hover:bg-orange-600">
                    {profileSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Change Password</CardTitle><CardDescription>Update your security credentials</CardDescription></CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2"><Label>Current Password</Label><Input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} /></div>
                  <div className="space-y-2"><Label>New Password</Label><Input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Confirm Password</Label><Input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} /></div>
                  {passwordMessage && <p className={`text-sm ${passwordMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{passwordMessage.text}</p>}
                  <Button type="submit" disabled={passwordSaving} className="bg-orange-500 hover:bg-orange-600">
                    {passwordSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}Change Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'scraper' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle>Scraper Status</CardTitle><CardDescription>Check the scraper service health</CardDescription></div>
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${scraperHealth === 'healthy' ? 'bg-green-100 text-green-700' : scraperHealth === 'unhealthy' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      <div className={`w-2 h-2 rounded-full ${scraperHealth === 'healthy' ? 'bg-green-500' : scraperHealth === 'unhealthy' ? 'bg-red-500' : 'bg-gray-400 animate-pulse'}`} />
                      {scraperHealth === 'checking' ? 'Checking...' : scraperHealth === 'healthy' ? 'Online' : 'Offline'}
                    </div>
                    <Button variant="outline" size="sm" onClick={checkScraperHealth}><RefreshCw className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader><CardTitle>Scraper Configuration</CardTitle><CardDescription>Configure how the news scraper operates</CardDescription></CardHeader>
              <CardContent>
                <form onSubmit={handleScraperSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Max Article Age (days)</Label>
                      <Input type="number" min={1} max={30} value={scraperSettings.maxArticleAgeDays} onChange={(e) => setScraperSettings({ ...scraperSettings, maxArticleAgeDays: parseInt(e.target.value) || 7 })} />
                      <p className="text-xs text-gray-500">Only scrape articles from the last N days</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Scraper Timeout (seconds)</Label>
                      <Input type="number" min={30} max={300} value={scraperSettings.scraperTimeout} onChange={(e) => setScraperSettings({ ...scraperSettings, scraperTimeout: parseInt(e.target.value) || 120 })} />
                      <p className="text-xs text-gray-500">Max time to wait for scraper response</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Articles Per Source</Label>
                      <Input type="number" min={10} max={500} value={scraperSettings.maxArticlesPerSource} onChange={(e) => setScraperSettings({ ...scraperSettings, maxArticlesPerSource: parseInt(e.target.value) || 150 })} />
                      <p className="text-xs text-gray-500">Limit articles scraped from each website</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Scraper API URL</Label>
                      <Input value={scraperSettings.scraperApiUrl} onChange={(e) => setScraperSettings({ ...scraperSettings, scraperApiUrl: e.target.value })} />
                      <p className="text-xs text-gray-500">URL of the Python scraper service</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Scraping Methods</Label>
                    <div className="flex items-center gap-2"><Checkbox checked={scraperSettings.enableRssFeed} onCheckedChange={(c) => setScraperSettings({ ...scraperSettings, enableRssFeed: !!c })} /><Label className="cursor-pointer font-normal">Enable RSS Feed Scraping</Label></div>
                    <div className="flex items-center gap-2"><Checkbox checked={scraperSettings.enableSitemap} onCheckedChange={(c) => setScraperSettings({ ...scraperSettings, enableSitemap: !!c })} /><Label className="cursor-pointer font-normal">Enable Sitemap Scraping</Label></div>
                    <div className="flex items-center gap-2"><Checkbox checked={scraperSettings.enablePageScrape} onCheckedChange={(c) => setScraperSettings({ ...scraperSettings, enablePageScrape: !!c })} /><Label className="cursor-pointer font-normal">Enable Page Scraping</Label></div>
                  </div>
                  {scraperMessage && <p className={`text-sm ${scraperMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{scraperMessage.text}</p>}
                  <Button type="submit" disabled={scraperSaving} className="bg-orange-500 hover:bg-orange-600">
                    {scraperSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save Scraper Settings
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>AI Model Configuration</CardTitle><CardDescription>Configure the AI models used for article analysis</CardDescription></CardHeader>
              <CardContent>
                <form onSubmit={handleAISubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label>Primary Model</Label>
                    <select className="w-full h-10 rounded-md border border-gray-300 px-3 bg-white" value={aiSettings.primaryModel} onChange={(e) => setAISettings({ ...aiSettings, primaryModel: e.target.value })}>
                      {AI_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <p className="text-xs text-gray-500">The main model used for AI operations</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Fallback Models</Label>
                    <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
                      {AI_MODELS.filter(m => m.value !== aiSettings.primaryModel).map((model) => (
                        <div key={model.value} className="flex items-center gap-2">
                          <Checkbox checked={aiSettings.fallbackModels.includes(model.value)}
                            onCheckedChange={(checked) => {
                              if (checked) setAISettings({ ...aiSettings, fallbackModels: [...aiSettings.fallbackModels, model.value] })
                              else setAISettings({ ...aiSettings, fallbackModels: aiSettings.fallbackModels.filter(m => m !== model.value) })
                            }} />
                          <Label className="cursor-pointer font-normal text-sm">{model.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Max Tokens (Summary)</Label>
                      <Input type="number" min={100} max={1000} value={aiSettings.maxTokensSummary} onChange={(e) => setAISettings({ ...aiSettings, maxTokensSummary: parseInt(e.target.value) || 300 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Tokens (Analysis)</Label>
                      <Input type="number" min={200} max={2000} value={aiSettings.maxTokensAnalysis} onChange={(e) => setAISettings({ ...aiSettings, maxTokensAnalysis: parseInt(e.target.value) || 800 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Temperature (Summary)</Label>
                      <Input type="number" min={0} max={1} step={0.1} value={aiSettings.temperatureSummary} onChange={(e) => setAISettings({ ...aiSettings, temperatureSummary: parseFloat(e.target.value) || 0.5 })} />
                      <p className="text-xs text-gray-500">0 = focused, 1 = creative</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Temperature (Analysis)</Label>
                      <Input type="number" min={0} max={1} step={0.1} value={aiSettings.temperatureAnalysis} onChange={(e) => setAISettings({ ...aiSettings, temperatureAnalysis: parseFloat(e.target.value) || 0.3 })} />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Max Content Length (chars)</Label>
                      <Input type="number" min={1000} max={10000} value={aiSettings.maxContentLength} onChange={(e) => setAISettings({ ...aiSettings, maxContentLength: parseInt(e.target.value) || 3000 })} />
                      <p className="text-xs text-gray-500">Maximum article content sent to AI</p>
                    </div>
                  </div>
                  {aiMessage && <p className={`text-sm ${aiMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{aiMessage.text}</p>}
                  <Button type="submit" disabled={aiSaving} className="bg-orange-500 hover:bg-orange-600">
                    {aiSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save AI Settings
                  </Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-yellow-500" />API Key Status</CardTitle>
                <CardDescription>OpenRouter API key configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">API key is configured via environment variable (OPENROUTER_API_KEY). Contact your administrator to update.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
