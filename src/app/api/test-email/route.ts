import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to } = body

    if (!to) {
      return NextResponse.json({ error: 'Email "to" address required' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    console.log('[Test Email] API Key exists:', !!apiKey)
    console.log('[Test Email] API Key prefix:', apiKey?.substring(0, 10))

    if (!apiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
    }

    const resend = new Resend(apiKey)

    const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev'
    console.log('[Test Email] From:', fromEmail)
    console.log('[Test Email] To:', to)

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: to,
      subject: 'Test Email from Ovaview',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1 style="color: #f97316;">🎉 Email Test Successful!</h1>
          <p>If you're seeing this, your Resend integration is working correctly.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    })

    if (error) {
      console.error('[Test Email] Resend error:', error)
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

    console.log('[Test Email] Success:', data)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('[Test Email] Exception:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
