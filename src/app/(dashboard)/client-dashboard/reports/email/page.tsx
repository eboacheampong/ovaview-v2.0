'use client'

import { useState } from 'react'
import { Loader2, Mail, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { format } from 'date-fns'

interface SentReport {
  id: string
  sentAt: string
  recipients: string
  period: string
  status: 'sent' | 'failed'
}

export default function EmailReportsPage() {
  const { user } = useAuth()
  const [email, setEmail] = useState(user?.email || '')
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [history] = useState<SentReport[]>([])

  const handleSendNow = async () => {
    if (!email.trim()) { setError('Please enter an email address'); return }
    setError('')
    setSending(true)
    setSent(false)
    try {
      const res = await fetch('/api/client-dashboard/reports/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: user?.clientId,
          email: email.trim(),
          frequency,
        }),
      })
      if (res.ok) {
        setSent(true)
        setTimeout(() => setSent(false), 5000)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to send report')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Email Reports</h1>
      <p className="text-sm text-gray-500">Configure and send media monitoring reports to your inbox.</p>

      {/* Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Mail className="h-4 w-4 text-indigo-500" /> Report Settings
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Recipient Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full sm:w-96 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Frequency</label>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map(f => (
              <button key={f} onClick={() => setFrequency(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  frequency === f
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {sent && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" /> Report sent successfully
          </div>
        )}

        <button onClick={handleSendNow} disabled={sending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 transition-colors">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? 'Sending...' : 'Send Report Now'}
        </button>
      </div>

      {/* Report History */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-gray-400" /> Report History
        </h2>
        {history.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No reports sent yet</p>
            <p className="text-gray-400 text-xs mt-1">Send your first report using the form above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Recipients</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Period</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{format(new Date(r.sentAt), 'MMM d, yyyy HH:mm')}</td>
                    <td className="px-4 py-3 text-gray-600">{r.recipients}</td>
                    <td className="px-4 py-3 text-gray-600">{r.period}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                        r.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {r.status === 'sent' ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
