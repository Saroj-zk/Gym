import cron from 'node-cron'
import Membership from '../models/Membership.js'
import User from '../models/User.js'
import Pack from '../models/Pack.js'
import { sendSMS, getSMSTemplate } from '../utils/sms.js'

function dayRange(daysFromNow: number) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() + daysFromNow)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

export async function runExpiryReminderOnce() {
  const gym = process.env.GYM_NAME || 'Your Gym'
  let totalSent = 0

  // 1. Check for 7-day reminders
  const { start: s7, end: e7 } = dayRange(7)
  const list7 = await Membership.find({
    status: 'active',
    endDate: { $gte: s7, $lt: e7 },
    $or: [{ 'reminders.sevenDay': { $ne: true } }],
  }).populate('userId', 'firstName mobile userId').populate('packId', 'name')

  for (const m of list7) {
    const user: any = (m as any).userId
    if (user?.mobile) {
      const msg = await getSMSTemplate('reminder_7d', {
        USER_NAME: user.firstName || 'Member',
        END_DATE: m.endDate ? new Date(m.endDate).toLocaleDateString() : ''
      });
      if ((await sendSMS(user.mobile, msg)).ok) {
        totalSent++
        await Membership.updateOne({ _id: m._id }, { $set: { 'reminders.sevenDay': true } })
      }
    }
  }

  // 2. Check for 3-day reminders
  const { start: s3, end: e3 } = dayRange(3)
  const list3 = await Membership.find({
    status: 'active',
    endDate: { $gte: s3, $lt: e3 },
    $or: [{ 'reminders.threeDay': { $ne: true } }],
  }).populate('userId', 'firstName mobile userId').populate('packId', 'name')

  for (const m of list3) {
    const user: any = (m as any).userId
    if (user?.mobile) {
      const msg = await getSMSTemplate('reminder_3d', {
        USER_NAME: user.firstName || 'Member',
        END_DATE: m.endDate ? new Date(m.endDate).toLocaleDateString() : ''
      });
      if ((await sendSMS(user.mobile, msg)).ok) {
        totalSent++
        await Membership.updateOne({ _id: m._id }, { $set: { 'reminders.threeDay': true } })
      }
    }
  }

  return totalSent
}

export function scheduleExpiryReminder() {
  const tz = process.env.TZ || 'Asia/Kolkata'
  // every day at 09:15 local time
  cron.schedule('15 9 * * *', async () => {
    try {
      const n = await runExpiryReminderOnce()
      if (n > 0) console.log(`[reminder] sent ${n} expiry reminders`)
    } catch (e) {
      console.error('[reminder] job error:', e)
    }
  }, { timezone: tz })
}
