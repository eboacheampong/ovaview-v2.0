'use client'

import { useState, useCallback } from 'react'

export interface UseModalReturn<T = undefined> {
  isOpen: boolean
  data: T | null
  open: (data?: T) => void
  close: () => void
}

export function useModal<T = undefined>(): UseModalReturn<T> {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<T | null>(null)

  const open = useCallback((modalData?: T) => {
    setData(modalData ?? null)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setData(null)
  }, [])

  return {
    isOpen,
    data,
    open,
    close,
  }
}

// Convenience hook for confirmation dialogs
export interface UseConfirmReturn {
  isOpen: boolean
  message: { title: string; description: string } | null
  confirm: (title: string, description: string) => Promise<boolean>
  close: () => void
  handleConfirm: () => void
  handleCancel: () => void
}

export function useConfirm(): UseConfirmReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState<{ title: string; description: string } | null>(null)
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((title: string, description: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setMessage({ title, description })
      setResolveRef(() => resolve)
      setIsOpen(true)
    })
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setMessage(null)
    setResolveRef(null)
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef?.(true)
    close()
  }, [resolveRef, close])

  const handleCancel = useCallback(() => {
    resolveRef?.(false)
    close()
  }, [resolveRef, close])

  return {
    isOpen,
    message,
    confirm,
    close,
    handleConfirm,
    handleCancel,
  }
}
