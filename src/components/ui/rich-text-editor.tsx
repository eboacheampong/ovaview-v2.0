'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Link2, Unlink, Undo, Redo, X, ExternalLink, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState, useCallback } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  const isInternalChange = useRef(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [isEditingLink, setIsEditingLink] = useState(false)
  const [showLinkPopup, setShowLinkPopup] = useState(false)
  const [linkPopupPosition, setLinkPopupPosition] = useState({ top: 0, left: 0 })
  const [currentLinkUrl, setCurrentLinkUrl] = useState('')
  const linkInputRef = useRef<HTMLInputElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline cursor-pointer',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      isInternalChange.current = true
      onChange(editor.getHTML())
    },
    onSelectionUpdate: ({ editor }) => {
      // Check if cursor is on a link
      if (editor.isActive('link')) {
        const href = editor.getAttributes('link').href
        setCurrentLinkUrl(href || '')
        
        // Get selection position for popup
        const { from } = editor.state.selection
        const coords = editor.view.coordsAtPos(from)
        const containerRect = editorContainerRef.current?.getBoundingClientRect()
        
        if (containerRect) {
          setLinkPopupPosition({
            top: coords.top - containerRect.top - 45,
            left: coords.left - containerRect.left,
          })
          setShowLinkPopup(true)
        }
      } else {
        setShowLinkPopup(false)
      }
    },
  })

  // Sync external value changes to the editor
  useEffect(() => {
    if (editor && !isInternalChange.current) {
      const currentContent = editor.getHTML()
      if (value !== currentContent && value !== '') {
        editor.commands.setContent(value, { emitUpdate: false })
      }
    }
    isInternalChange.current = false
  }, [value, editor])

  // Focus input when modal opens
  useEffect(() => {
    if (showLinkModal && linkInputRef.current) {
      setTimeout(() => linkInputRef.current?.focus(), 100)
    }
  }, [showLinkModal])

  // Hide popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.link-popup') && !target.closest('.ProseMirror a')) {
        setShowLinkPopup(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const openLinkModal = useCallback((editing = false) => {
    if (!editor) return
    const existingUrl = editor.getAttributes('link').href || ''
    setLinkUrl(existingUrl)
    setIsEditingLink(editing)
    setShowLinkModal(true)
    setShowLinkPopup(false)
  }, [editor])

  const handleAddLink = useCallback(() => {
    if (!editor) return
    if (linkUrl) {
      let url = linkUrl
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
    setShowLinkModal(false)
    setLinkUrl('')
    setIsEditingLink(false)
  }, [editor, linkUrl])

  const handleRemoveLink = useCallback(() => {
    if (!editor) return
    editor.chain().focus().unsetLink().run()
    setShowLinkPopup(false)
  }, [editor])

  const handleVisitLink = useCallback(() => {
    if (currentLinkUrl) {
      window.open(currentLinkUrl, '_blank', 'noopener,noreferrer')
    }
    setShowLinkPopup(false)
  }, [currentLinkUrl])

  if (!editor) {
    return (
      <div className={cn('border border-gray-300 rounded-md bg-white min-h-[300px]', className)}>
        <div className="p-3 text-gray-400">Loading editor...</div>
      </div>
    )
  }

  const handleHeadingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const level = parseInt(e.target.value)
    if (level === 0) {
      editor.chain().focus().setParagraph().run()
    } else {
      editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()
    }
  }

  const getCurrentHeadingLevel = () => {
    if (editor.isActive('heading', { level: 1 })) return '1'
    if (editor.isActive('heading', { level: 2 })) return '2'
    if (editor.isActive('heading', { level: 3 })) return '3'
    return '0'
  }

  const ToolbarButton = ({ onClick, isActive, children, title, disabled }: { onClick: () => void; isActive?: boolean; children: React.ReactNode; title: string; disabled?: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        'p-1.5 rounded hover:bg-gray-100 transition-colors',
        isActive && 'bg-gray-200 text-orange-600',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )

  const wordCount = editor.getText().trim().split(/\s+/).filter((w: string) => w.length > 0).length

  return (
    <div ref={editorContainerRef} className={cn('border border-gray-300 rounded-md bg-white relative', className)}>
      {/* Link Popup - shows when cursor is on a link */}
      {showLinkPopup && (
        <div 
          className="link-popup absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200 flex items-center gap-1 p-1"
          style={{ top: linkPopupPosition.top, left: Math.max(10, linkPopupPosition.left) }}
        >
          <button
            type="button"
            onClick={handleVisitLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Open link in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Visit
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <button
            type="button"
            onClick={() => openLinkModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Edit link"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <button
            type="button"
            onClick={handleRemoveLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Remove link"
          >
            <Unlink className="h-3.5 w-3.5" />
            Unlink
          </button>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="absolute inset-0 bg-black/20 z-50 flex items-start justify-center pt-20 rounded-md">
          <div className="bg-white rounded-lg shadow-xl p-4 w-96 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">
                {isEditingLink ? 'Edit Link' : 'Insert Link'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowLinkModal(false)
                  setLinkUrl('')
                  setIsEditingLink(false)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">URL</label>
                <input
                  ref={linkInputRef}
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddLink()
                    }
                    if (e.key === 'Escape') {
                      setShowLinkModal(false)
                      setLinkUrl('')
                      setIsEditingLink(false)
                    }
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkModal(false)
                    setLinkUrl('')
                    setIsEditingLink(false)
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddLink}
                  disabled={!linkUrl}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEditingLink ? 'Update Link' : 'Add Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Bar */}
      <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1">
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
          <select 
            className="border border-gray-200 rounded px-2 py-1 text-sm bg-white cursor-pointer"
            onChange={handleHeadingChange}
            value={getCurrentHeadingLevel()}
          >
            <option value="0">Paragraph</option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
          </select>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="border-b border-gray-200 p-2 flex items-center gap-1 flex-wrap">
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className="h-4 w-4" />
        </ToolbarButton>
        
        <div className="h-4 w-px bg-gray-200 mx-1"></div>
        
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBold().run()} 
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleUnderline().run()} 
          isActive={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        
        <div className="h-4 w-px bg-gray-200 mx-1"></div>
        
        <ToolbarButton 
          onClick={() => editor.chain().focus().setTextAlign('left').run()} 
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().setTextAlign('center').run()} 
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().setTextAlign('right').run()} 
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        
        <div className="h-4 w-px bg-gray-200 mx-1"></div>
        
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBulletList().run()} 
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleOrderedList().run()} 
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        
        <div className="h-4 w-px bg-gray-200 mx-1"></div>
        
        <ToolbarButton 
          onClick={() => openLinkModal(false)} 
          isActive={editor.isActive('link')}
          title="Add Link"
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton 
          onClick={handleRemoveLink}
          disabled={!editor.isActive('link')}
          title="Remove Link"
        >
          <Unlink className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor Content with proper styles */}
      <style jsx global>{`
        .ProseMirror {
          min-height: 300px;
          padding: 12px;
          outline: none;
        }
        .ProseMirror p {
          margin: 0.5em 0;
        }
        .ProseMirror h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.67em 0;
        }
        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.75em 0;
        }
        .ProseMirror h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin: 0.83em 0;
        }
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .ProseMirror li {
          margin: 0.25em 0;
        }
        .ProseMirror li p {
          margin: 0;
        }
        .ProseMirror a {
          color: #3b82f6;
          text-decoration: underline;
          cursor: pointer;
        }
        .ProseMirror:focus {
          outline: none;
        }
      `}</style>
      <EditorContent editor={editor} />

      {/* Footer */}
      <div className="border-t border-gray-200 px-3 py-2 flex justify-between text-sm text-gray-500">
        <span>p</span>
        <span>Words: {wordCount}</span>
      </div>
    </div>
  )
}
