'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Wand2, Loader2, Share2, User, Calendar, Heart, MessageCircle, Repeat2, Eye, Link2, Code } from 'lucide-react'

const platforms = [
  { value: 'TWITTER', label: 'Twitter/X' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
]

export default function AddSocialPostPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [industries, setIndustries] = useState<{ id: string; name: string }[]>([])
  
  const [formData, setFormData] = useState({
    platform: 'TWITTER',
    content: '',
    authorName: '',
    authorHandle: '',
    postUrl: '',
    embedUrl: '',
    embedHtml: '',
    keywords: '',
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 0,
    postedAt: new Date().toISOString().slice(0, 16),
    industryId: '',
  })

  useEffect(() => {
    fetch('/api/industries')
      .then(res => res.json())
      .then(data => setIndustries(data.industries || data || []))
      .catch(() => {})
  }, [])

  const generateEmbed = () => {
    const url = formData.postUrl
    if (!url) return

    let embedUrl = ''
    let embedHtml = ''

    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    if (ytMatch) {
      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`
      embedHtml = `<iframe width="100%" height="315" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
    }

    // Twitter/X
    const twMatch = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/)
    if (twMatch) {
      embedUrl = url
      embedHtml = `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`
    }

    // TikTok
    const ttMatch = url.match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/)
    if (ttMatch) {
      embedUrl = `https://www.tiktok.com/embed/v2/${ttMatch[1]}`
      embedHtml = `<iframe src="${embedUrl}" width="100%" height="750" frameborder="0" allowfullscreen></iframe>`
    }

    // Instagram
    const igMatch = url.match(/instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/)
    if (igMatch) {
      embedUrl = `${url}/embed`
      embedHtml = `<iframe src="${embedUrl}" width="100%" height="500" frameborder="0" scrolling="no" allowtransparency="true"></iframe>`
    }

    if (embedUrl || embedHtml) {
      setFormData(prev => ({ ...prev, embedUrl, embedHtml }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload = {
        ...formData,
        postId: `manual_${Date.now()}`,
        postedAt: new Date(formData.postedAt).toISOString(),
        industryId: formData.industryId || null,
      }

      const res = await fetch('/api/social-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        router.push('/media/social')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create post')
      }
    } catch (error) {
      alert('Failed to create post')
    } finally {
      setIsLoading(false)
    }
  }

  const industryOptions = [
    { value: '', label: 'Select industry' },
    ...industries.map(i => ({ value: i.id, label: i.name }))
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-6 px-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">New Social Post</h1>
          <p className="text-purple-100 text-sm mt-1">Manually add a social media post to the monitoring system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-8">
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Share2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Platform & Industry</h2>
              <p className="text-sm text-gray-500">Select the social platform and industry classification</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-600 mb-2 block">Platform</Label>
              <Select 
                options={platforms} 
                value={formData.platform} 
                onChange={e => setFormData(p => ({ ...p, platform: e.target.value }))} 
                className="h-11"
              />
            </div>
            <div>
              <Label className="text-gray-600 mb-2 block">Industry</Label>
              <Select 
                options={industryOptions} 
                value={formData.industryId} 
                onChange={e => setFormData(p => ({ ...p, industryId: e.target.value }))} 
                className="h-11"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Author Information</h2>
              <p className="text-sm text-gray-500">Details about the post author</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-600 mb-2 block">Author Name</Label>
              <Input value={formData.authorName} onChange={e => setFormData(p => ({ ...p, authorName: e.target.value }))} placeholder="John Doe" className="h-11" />
            </div>
            <div>
              <Label className="text-gray-600 mb-2 block">Author Handle</Label>
              <Input value={formData.authorHandle} onChange={e => setFormData(p => ({ ...p, authorHandle: e.target.value }))} placeholder="@johndoe" className="h-11" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <Label className="font-semibold text-gray-800">Post Content</Label>
          </div>
          <Textarea 
            value={formData.content} 
            onChange={e => setFormData(p => ({ ...p, content: e.target.value }))} 
            placeholder="Enter the post content..."
            rows={4}
            className="mb-4"
          />
          <div>
            <Label className="text-gray-600 mb-2 block">Keywords</Label>
            <Input value={formData.keywords} onChange={e => setFormData(p => ({ ...p, keywords: e.target.value }))} placeholder="mining, gold, industry" className="h-11" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Link2 className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">URL & Embed</h2>
              <p className="text-sm text-gray-500">Post URL and embed code for display</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-600 mb-2 block">Post URL</Label>
              <div className="flex gap-2">
                <Input 
                  value={formData.postUrl} 
                  onChange={e => setFormData(p => ({ ...p, postUrl: e.target.value }))} 
                  placeholder="https://twitter.com/user/status/123..."
                  className="flex-1 h-11"
                />
                <Button type="button" variant="outline" onClick={generateEmbed} className="h-11 px-4">
                  <Wand2 className="h-4 w-4 mr-2" /> Generate Embed
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-gray-600 mb-2 block">Embed URL</Label>
              <Input value={formData.embedUrl} onChange={e => setFormData(p => ({ ...p, embedUrl: e.target.value }))} placeholder="https://www.youtube.com/embed/..." className="h-11" />
            </div>
            <div>
              <Label className="text-gray-600 mb-2 flex items-center gap-2"><Code className="h-4 w-4" />Embed HTML</Label>
              <Textarea 
                value={formData.embedHtml} 
                onChange={e => setFormData(p => ({ ...p, embedHtml: e.target.value }))} 
                placeholder="<iframe src='...'></iframe>"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Heart className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Engagement & Date</h2>
              <p className="text-sm text-gray-500">Engagement metrics and posting date</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label className="text-gray-600 mb-2 flex items-center gap-1"><Heart className="h-3 w-3" />Likes</Label>
              <Input type="number" value={formData.likesCount} onChange={e => setFormData(p => ({ ...p, likesCount: parseInt(e.target.value) || 0 }))} className="h-11" />
            </div>
            <div>
              <Label className="text-gray-600 mb-2 flex items-center gap-1"><MessageCircle className="h-3 w-3" />Comments</Label>
              <Input type="number" value={formData.commentsCount} onChange={e => setFormData(p => ({ ...p, commentsCount: parseInt(e.target.value) || 0 }))} className="h-11" />
            </div>
            <div>
              <Label className="text-gray-600 mb-2 flex items-center gap-1"><Repeat2 className="h-3 w-3" />Shares</Label>
              <Input type="number" value={formData.sharesCount} onChange={e => setFormData(p => ({ ...p, sharesCount: parseInt(e.target.value) || 0 }))} className="h-11" />
            </div>
            <div>
              <Label className="text-gray-600 mb-2 flex items-center gap-1"><Eye className="h-3 w-3" />Views</Label>
              <Input type="number" value={formData.viewsCount} onChange={e => setFormData(p => ({ ...p, viewsCount: parseInt(e.target.value) || 0 }))} className="h-11" />
            </div>
            <div>
              <Label className="text-gray-600 mb-2 flex items-center gap-1"><Calendar className="h-3 w-3" />Posted At</Label>
              <Input type="datetime-local" value={formData.postedAt} onChange={e => setFormData(p => ({ ...p, postedAt: e.target.value }))} className="h-11" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()} className="px-6">Cancel</Button>
          <Button type="submit" className="bg-purple-500 hover:bg-purple-600 text-white px-8" disabled={isLoading}>
            {isLoading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>) : 'Create Post'}
          </Button>
        </div>
      </form>
    </div>
  )
}
