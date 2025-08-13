import mongoose, { Schema, InferSchemaType } from 'mongoose';

const UserSchema = new Schema({
  userId: { type: String, index: true, unique: true },

  firstName: String,
  lastName: String,

  dob: Date,
  gender: String,

  mobile: { type: String, unique: true, sparse: true },
  mobileEmergency: String,
  email: { type: String, unique: true, sparse: true },

  address: String,
  referralSource: String,

  healthNotes: String,     // for trainers
  notes: { type: String, default: '' }, // admin/trainer notes (used by Profile page)

  profileImageUrl: String,

  status: { type: String, default: 'active' },   // 'active' | 'inactive' | ...
  role: { type: String, default: 'member' },     // 'member' | 'admin' | ...
}, { timestamps: true });

// IMPORTANT: no Express router code in model files.
type User = InferSchemaType<typeof UserSchema>;
const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export default UserModel;
export type { User };
