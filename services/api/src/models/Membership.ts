import mongoose, { Schema, InferSchemaType, Types } from 'mongoose';

const MembershipSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  packId: { type: Schema.Types.ObjectId, ref: 'Pack' },
  startDate: Date,
  endDate: Date,
  price: Number,
  discount: Number,
  reminders: {
    sevenDay: { type: Boolean, default: false },
    threeDay: { type: Boolean, default: false },
  },
  paymentStatus: { type: String, enum: ['paid', 'pending', 'partial'], default: 'pending' },
  status: { type: String, enum: ['active', 'expired', 'suspended', 'upgraded'], default: 'active' },
  notes: String,
}, { timestamps: true });

export type Membership = InferSchemaType<typeof MembershipSchema>;
export default mongoose.model('Membership', MembershipSchema);
