import bcrypt from 'bcrypt';
import User from '../models/User';

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const exists = await User.findOne({ email: email.toLowerCase(), role: 'admin' });
  if (exists) return;

  const hash = await bcrypt.hash(password, 10);
  const userId = email.split('@')[0];

  await User.create({
    userId,
    email: email.toLowerCase(),
    firstName: 'Admin',
    lastName: '',
    role: 'admin',
    status: 'active',
    passwordHash: hash,
  });

  console.log('[seedAdmin] Admin created:', email);
}
