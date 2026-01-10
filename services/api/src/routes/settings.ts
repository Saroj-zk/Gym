import { Router } from 'express';
import Setting from '../models/Setting.js';
import { requireRole, readAuth, ADMIN_COOKIE } from '../utils/auth.js';

const router = Router();
router.use(readAuth(ADMIN_COOKIE));


import User from '../models/User.js';
import { sendSMS, getSMSTemplate } from '../utils/sms.js';

// SMS Message Templates
router.get('/messages', requireRole('admin'), async (_req, res) => {
    const s = await Setting.findOne({ key: 'sms_templates' }).lean();
    const defaults = {
        welcome: `--- {{GYM_NAME}} ---\nWelcome, {{USER_NAME}}! 🏋️\n\nYour {{PACK_NAME}} is now active.\n📅 Start: {{START_DATE}}\n🔚 Expiry: {{END_DATE}}\nMember ID: {{USER_ID}}\n\nLet's smash your goals together! 💪`,
        supplement: `--- {{GYM_NAME}} ---\nNew Stock Alert! 🔥\n\nWe've just added {{PRODUCT_NAME}} to our inventory. 💊\n\nVisit the desk or check the member app for details.\nTrain hard, recover harder!`,
        reminder_7d: `--- {{GYM_NAME}} ---\nRENEWAL REMINDER ⏳\n\nHi {{USER_NAME}}, your membership expires in 7 days ({{END_DATE}}).\n\nDon't break your streak! Renew today at the desk or via the portal. 📈`,
        reminder_3d: `--- {{GYM_NAME}} ---\nURGENT: Pack Expiring 🛑\n\nHey {{USER_NAME}}, only 3 days left on your current pack (expires {{END_DATE}}).\n\nRenew now to avoid any interruption in your training. 🏋️‍♂️`,
        broadcast: `--- {{GYM_NAME}} ---\nSpecial Update 📢\n\n{{MESSAGE}}\n\nStay fit, stay strong! 🔥`
    };
    res.json(s?.value || defaults);
});

router.put('/messages', requireRole('admin'), async (req, res) => {
    await Setting.updateOne(
        { key: 'sms_templates' },
        { $set: { value: req.body } },
        { upsert: true }
    );
    res.json({ ok: true });
});

/**
 * POST /settings/broadcast
 * Body: { message: string, target: 'all' | 'active' }
 */
router.post('/broadcast', requireRole('admin'), async (req, res) => {
    const { message, target = 'active', recipients } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    console.log(`[Broadcast] Sending to ${target}. Recipients: ${recipients?.length || 'all'}`);

    let query: any = { role: 'member', mobile: { $exists: true, $ne: '' } };

    if (target === 'selected') {
        if (!Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ error: 'No recipients selected' });
        }
        // recipients could be _ids or userIds. assuming _ids based on UI likely usage
        // but let's handle both or stick to _id.
        query._id = { $in: recipients };
    } else if (target === 'active') {
        query.status = 'active';
    }

    const users = await User.find(query).select('mobile firstName').limit(target === 'selected' ? 1000 : 500);

    const formattedMsg = await getSMSTemplate('broadcast', { MESSAGE: message });

    let successCount = 0;
    for (const user of users) {
        if (user.mobile) {
            const { ok } = await sendSMS(user.mobile, formattedMsg);
            if (ok) successCount++;
        }
    }

    res.json({ ok: true, sent: successCount, total: users.length });
});

export default router;
