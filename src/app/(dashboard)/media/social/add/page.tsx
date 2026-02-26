'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Wand2 } from 'lucide-react'
import Link from 'next/link'

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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/media/social">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Social Post</h1>
          <p className="text-gray-500">Manually add a social media post</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform & Author</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Platform</Label>
              <Select 
                options={platforms} 
                value={formData.platform} 
                onChange={e => setFormData(p => ({ ...p, platform: e.target.value }))} 
              />
            </div>
            <div>
              <Label>Industry</Label>
              <Select 
                options={industryOptions} 
                value={formData.industryId} 
                onChange={e => setFormData(p => ({ ...p, industryId: e.target.value }))} 
              />
            </div>
            <div>
              <Label>Author Name</Label>
              <Input value={formData.authorName} onChange={e => setFormData(p => ({ ...p, authorName: e.target.value }))} placeholder="John Doe" />
            </div>
            <div>
              <Label>Author Handle</Label>
              <Input value={formData.authorHandle} onChange={e => setFormData(p => ({ ...p, authorHandle: e.target.value }))} placeholder="@johndoe" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Post Content</Label>
              <Textarea 
                value={formData.content} 
                onChange={e => setFormData(p => ({ ...p, content: e.target.value }))} 
                placeholder="Enter the post content..."
                rows={4}
              />
            </div>
            <div>
              <Label>Keywords</Label>
              <Input value={formData.keywords} onChange={e => setFormData(p => ({ ...p, keywords: e.target.value }))} placeholder="mining, gold, industry" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>URL & Embed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Post URL</Label>
              <div className="flex gap-2">
                <Input 
                  value={formData.postUrl} 
                  onChange={e => setFormData(p => ({ ...p, postUrl: e.target.value }))} 
                  placeholder="https://twitter.com/user/status/123..."
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={generateEmbed}>
                  <Wand2 className="h-4 w-4 mr-2" /> Generate Embed
                </Button>
              </div>
            </div>
            <div>
              <Label>Embed URL</Label>
              <Input value={formData.embedUrl} onChange={e => setFormData(p => ({ ...p, embedUrl: e.target.value }))} placeholder="https://www.youtube.com/embed/..." />
            </div>
            <div>
              <Label>Embed HTML</Label>
              <Textarea 
                value={formData.embedHtml} 
                onChange={e => setFormData(p => ({ ...p, embedHtml: e.target.value }))} 
                placeholder="<iframe src='...'></iframe>"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement & Date</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label>Likes</Label>
              <Input type="number" value={formData.likesCount} onChange={e => setFormData(p => ({ ...p, likesCount: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Comments</Label>
              <Input type="number" value={formData.commentsCount} onChange={e => setFormData(p => ({ ...p, commentsCount: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Shares</Label>
              <Input type="number" value={formData.sharesCount} onChange={e => setFormData(p => ({ ...p, sharesCount: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Views</Label>
              <Input type="number" value={formData.viewsCount} onChange={e => setFormData(p => ({ ...p, viewsCount: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Posted At</Label>
              <Input type="datetime-local" value={formData.postedAt} onChange={e => setFormData(p => ({ ...p, postedAt: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/media/social">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isLoading} className="bg-purple-500 hover:bg-purple-600">
            {isLoading ? 'Creating...' : 'Create Post'}
          </Button>
        </div>
      </form>
    </div>
  )
}
