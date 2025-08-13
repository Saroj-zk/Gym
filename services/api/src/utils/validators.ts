import { z } from 'zod';

export const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.string().optional(),
  gender: z.string().optional(),
  mobile: z.string().min(8).optional(),
  mobileEmergency: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  referralSource: z.string().optional(),
  healthNotes: z.string().optional(),
  profileImageUrl: z.string().optional(),
  status: z.enum(['active','inactive','pending','suspended']).optional(),
  role: z.enum(['member','trainer','admin','manager','receptionist']).optional(),
  packId: z.string().optional(),
  startDate: z.string().optional()
});

export const createPackSchema = z.object({
  name: z.string().min(1),
  durationType: z.enum(['days','months','sessions']),
  durationValue: z.number().int().positive(),
  price: z.number().nonnegative(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  discountOptions: z.any().optional(),
  isActive: z.boolean().optional()
});

export const createMembershipSchema = z.object({
  userId: z.string(),
  packId: z.string(),
  startDate: z.string().optional(),
  price: z.number().optional(),
  discount: z.number().optional()
});

export const recordPaymentSchema = z.object({
  userId: z.string(),
  membershipId: z.string().optional(),
  amount: z.number().positive(),
  method: z.enum(['cash','card','upi','bank','online']),
  description: z.string().optional()
});

export const markAttendanceSchema = z.object({
  userId: z.string(),
  method: z.enum(['qr','manual','kiosk','face']).optional(),
  deviceId: z.string().optional()
});
