import Twilio from 'twilio'

const enabled = String(process.env.SMS_ENABLED || '').toLowerCase() === 'true'
const sid = process.env.TWILIO_ACCOUNT_SID || ''
const token = process.env.TWILIO_AUTH_TOKEN || ''
const from = process.env.TWILIO_FROM || ''
const defaultCountry = (process.env.SMS_DEFAULT_COUNTRY || 'IN').toUpperCase()

const client = (sid && token) ? Twilio(sid, token) : null

function toE164(raw: string | undefined | null): string | null {
  if (!raw) return null
  let s = String(raw).trim().replace(/[^\d+]/g, '')
  if (!s) return null
  if (s.startsWith('+')) return s
  if (defaultCountry === 'IN' && /^\d{10}$/.test(s)) return `+91${s}`
  if (/^\d{6,15}$/.test(s)) return `+${s}`
  return null
}

export async function sendSMS(toRaw: string | undefined | null, body: string) {
  if (!enabled) return { ok: false, skipped: 'disabled' as const }
  if (!client || !from) return { ok: false, error: 'Twilio not configured' }

  const to = toE164(toRaw)
  if (!to) return { ok: false, error: 'invalid-destination' }

  try {
    const msg = await client.messages.create({ to, from, body })
    return { ok: true, sid: msg.sid }
  } catch (e: any) {
    console.error('sendSMS error:', e?.message || e)
    return { ok: false, error: e?.message || 'unknown' }
  }
}
