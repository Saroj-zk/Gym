import cron from 'node-cron'
import Membership from '../models/Membership.js'
import User from '../models/User.js'
import Pack from '../models/Pack.js'
import { sendSMS } from '../utils/sms.js'

function dayRange(daysFromNow: number) {
  const start = new Date()
  start.setHours(0,0,0,0)
  start.setDate(start.getDate() + daysFromNow)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

export async function runExpiryReminderOnce() {
  const { start, end } = dayRange(7)
  // Only memberships that have a real endDate and are active
  const list = await Membership.find({
    status: 'active',
    endDate: { $gte: start, $lt: end },
    $or: [
      { 'reminders.sevenDay': { $exists: false } },
      { 'reminders.sevenDay': { $ne: true } },
    ],
  })
  .populate('userId', 'firstName mobile userId')
  .populate('packId', 'name')

  let sent = 0
  const gym = process.env.GYM_NAME || 'Your Gym'

  for (const m of list) {
    const user: any = (m as any).userId
    const pack: any = (m as any).packId
    if (!user?.mobile) continue

    const endStr = m.endDate ? new Date(m.endDate).toLocaleDateString() : ''
    const body = `Hi ${user.firstName || 'member'}, your ${pack?.name || 'membership'} at ${gym} expires on ${endStr} (in 7 days). Renew now to avoid interruption.`

    const r = await sendSMS(user.mobile, body)
    if (r.ok) {
      sent++
      // mark as reminded to avoid duplicates
      await Membership.updateOne({ _id: m._id }, { $set: { 'reminders.sevenDay': true } })
    }
  }
  return sent
}

export function scheduleExpiryReminder() {
  // every day 09:15 local (TZ from env), change if you prefer another time
  const tz = process.env.TZ || 'Asia/Kolkata'
  cron.schedule('15 9 * * *', async () => {
    try {
      const n = await runExpiryReminderOnce()
      if (n > 0) console.log(`[reminder] sent ${n} expiry reminders`)
    } catch (e) {
      console.error('[reminder] job error:', e)
    }
  }, { timezone: tz })
}
