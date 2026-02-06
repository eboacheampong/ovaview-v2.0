'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { ChevronRight, ChevronLeft, Loader2, Globe, Calendar, User, FileText, Image as ImageIcon, Trash2, Wand2, ArrowLeft } from 'lucide-react'

const publications = [
  { id: '1', name: 'TechCrunch Africa' },
  { id: '2', name: 'Business Daily Online' },
  { id: '3', name: 'The Star Online' },
  { id: '4', name: 'Nation Online' },
]

const industries = [