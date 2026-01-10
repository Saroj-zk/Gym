import Twilio from 'twilio'
import Setting from '../models/Setting.js'

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

  // Already E.164
  if (s.startsWith('+') && s.length > 9) return s

  // Domestic numbers
  if (defaultCountry === 'IN') {
    // 10 digits (e.g. 9876543210) -> +91...
    if (/^\d{10}$/.test(s)) return `+91${s}`
    // 11 digits starting with 0 (e.g. 09876543210) -> +91...
    if (/^\d{11}$/.test(s) && s.startsWith('0')) return `+91${s.substring(1)}`
    // 12 digits starting with 91 (e.g. 919876543210) -> +91...
    if (/^\d{12}$/.test(s) && s.startsWith('91')) return `+${s}`
  }

  // Generic fallback: valid length for most countries is 7-15 digits
  if (/^\d{7,15}$/.test(s)) return `+${s}`

  return null
}

export async function sendSMS(toRaw: string | undefined | null, body: string) {
  if (!enabled) {
    console.log(`[SMS] Skipped (disabled): to=${toRaw}`)
    return { ok: false, skipped: 'disabled' as const }
  }
  if (!client || !from) {
    console.error(`[SMS] Failed: Twilio not configured properly (sid=${!!sid}, token=${!!token}, from=${!!from})`)
    return { ok: false, error: 'Twilio not configured' }
  }

  const to = toE164(toRaw)
  if (!to) {
    console.warn(`[SMS] Invalid number: ${toRaw}`)
    return { ok: false, error: 'invalid-destination' }
  }

  try {
    const msg = await client.messages.create({ to, from, body })
    console.log(`[SMS] Sent to ${to}: ${msg.sid}`)
    return { ok: true, sid: msg.sid }
  } catch (e: any) {
    console.error('sendSMS error:', e?.message || e)
    return { ok: false, error: e?.message || 'unknown' }
  }
}

export async function getSMSTemplate(key: string, vars: Record<string, string>) {
  const s = await Setting.findOne({ key: 'sms_templates' }).lean();
  const defaults = {
    welcome: `--- {{GYM_NAME}} ---\nWelcome, {{USER_NAME}}! 🏋️\n\nYour {{PACK_NAME}} is now active.\n📅 Start: {{START_DATE}}\n🔚 Expiry: {{END_DATE}}\nMember ID: {{USER_ID}}\n\nLet's smash your goals together! 💪`,
    supplement: `--- {{GYM_NAME}} ---\nNew Stock Alert! 🔥\n\nWe've just added {{PRODUCT_NAME}} to our inventory. 💊\n\nVisit the desk or check the member app for details.\nTrain hard, recover harder!`,
    reminder_7d: `--- {{GYM_NAME}} ---\nRENEWAL REMINDER ⏳\n\nHi {{USER_NAME}}, your membership expires in 7 days ({{END_DATE}}).\n\nDon't break your streak! Renew today at the desk or via the portal. 📈`,
    reminder_3d: `--- {{GYM_NAME}} ---\nURGENT: Pack Expiring 🛑\n\nHey {{USER_NAME}}, only 3 days left on your current pack (expires {{END_DATE}}).\n\nRenew now to avoid any interruption in your training. 🏋️‍♂️`,
    broadcast: `--- {{GYM_NAME}} ---\nSpecial Update 📢\n\n{{MESSAGE}}\n\nStay fit, stay strong! 🔥`
  };

  const templates: any = s?.value || defaults;
  let text = templates[key] || templates['broadcast'] || '';

  const allVars = { ...vars, GYM_NAME: process.env.GYM_NAME || 'GymStack' };

  for (const [k, v] of Object.entries(allVars)) {
    text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
  }
  return text;
}


