'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Wand2, ExternalLink, Loader2 } from 'lucide-react'
import Link from 'next/link'

const platforms = [
  { value: 'TWITTER', label: 'Twitter/X' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
]

const platformColors: Record<string, string> = {
  TWITTER: 'bg-blue-100 text-blue-700',
  YOUTUBE: 'bg-red-100 text-red-700',
  FACEBOOK: 'bg-indigo-100 text-indigo-700',
  LINKEDIN: 'bg-blue-100 text-blue-800',
  INSTAGRAM: 'bg-pink-100 text-pink-700',
  TIKTOK: 'bg-gray-100 text-gray-700',
}

export default function EditSocialPostPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [industries, setIndustries] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  
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
    postedAt: '',
    industryId: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/industries').then(res => res.json()),
      fetch(`/api/social-posts/${postId}`).then(res => res.json()),
    ])
      .then(([industriesData, postData]) => {
        setIndustries(industriesData.industries || industriesData || [])
        
        if (postData.error) {
          setError(postData.error)
          return
        }

        setFormData({
          platform: postData.platform || 'TWITTER',
          content: postData.content || '',
          authorName: postData.authorName || '',
          authorHandle: postData.authorHandle || '',
          postUrl: postData.postUrl || '',
          embedUrl: postData.embedUrl || '',
          embedHtml: postData.embedHtml || '',
          keywords: postData.keywords || '',
          likesCount: postData.likesCount || 0,
          commentsCount: postData.commentsCount || 0,
          sharesCount: postData.sharesCount || 0,
          viewsCount: postData.viewsCount || 0,
          postedAt: postData.postedAt ? new Date(postData.postedAt).toISOString().slice(0, 16) : '',
          industryId: postData.industryId || '',
        })
      })
      .catch(() => setError('Failed to load post'))
      .finally(() => setIsLoading(false))
  }, [postId])

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
    setIsSaving(true)

    try {
      const payload = {
        content: formData.content,
        embedUrl: formData.embedUrl,
        embedHtml: formData.embedHtml,
        keywords: formData.keywords,
        industryId: formData.industryId || null,
      }

      const res = await fetch(`/api/social-posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        router.push('/media/social')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update post')
      }
    } catch (error) {
      alert('Failed to update post')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Link href="/media/social">
            <Button variant="outline">Back to Social Posts</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/media/social">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Edit Social Post</h1>
            <Badge className={platformColors[formData.platform] || 'bg-gray-100'}>
              {formData.platform}
            </Badge>
          </div>
          <p className="text-gray-500">Update social media post details</p>
        </div>
        {formData.postUrl && (
          <Button variant="outline" size="sm" onClick={() => window.open(formData.postUrl, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" /> View Original
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Post Info (Read-only)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Platform</Label>
              <Input value={platforms.find(p => p.value === formData.platform)?.label || formData.platform} disabled />
            </div>
            <div>
              <Label>Posted At</Label>
              <Input value={formData.postedAt ? new Date(formData.postedAt).toLocaleString() : 'Unknown'} disabled />
            </div>
            <div>
              <Label>Author Name</Label>
              <Input value={formData.authorName || 'Unknown'} disabled />
            </div>
            <div>
              <Label>Author Handle</Label>
              <Input value={formData.authorHandle || 'Unknown'} disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Editable Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Industry</Label>
              <Select value={formData.industryId} onValueChange={v => setFormData(p => ({ ...p, industryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No industry</SelectItem>
                  {industries.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                  disabled
                  className="flex-1 bg-gray-50"
                />
                <Button type="button" variant="outline" onClick={generateEmbed}>
                  <Wand2 className="h-4 w-4 mr-2" /> Regenerate Embed
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
            {formData.embedHtml && (
              <div>
                <Label>Embed Preview</Label>
                <div className="border rounded-lg p-4 bg-gray-50 mt-2">
                  <div dangerouslySetInnerHTML={{ __html: formData.embedHtml }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement Stats (Read-only)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Likes</Label>
              <Input type="number" value={formData.likesCount} disabled />
            </div>
            <div>
              <Label>Comments</Label>
              <Input type="number" value={formData.commentsCount} disabled />
            </div>
            <div>
              <Label>Shares</Label>
              <Input type="number" value={formData.sharesCount} disabled />
            </div>
            <div>
              <Label>Views</Label>
              <Input type="number" value={formData.viewsCount} disabled />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/media/social">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isSaving} className="bg-purple-500 hover:bg-purple-600">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
