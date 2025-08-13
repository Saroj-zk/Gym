import mongoose, { Schema, InferSchemaType } from 'mongoose';

const PaymentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  membershipId: { type: Schema.Types.ObjectId, ref: 'Membership' },
  amount: Number,
  currency: { type: String, default: 'INR' },
  method: { type: String, enum: ['cash','card','upi','bank','online'], default: 'cash' },
  gateway: { type: String, default: 'none' },
  gatewayRef: String,
  status: { type: String, enum: ['succeeded','pending','failed','refunded','partial'], default: 'succeeded' },
  description: String,
  receiptUrl: String,
  paidAt: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export type Payment = InferSchemaType<typeof PaymentSchema>;
export default mongoose.model('Payment', PaymentSchema);
