// services/api/src/models/Payment.ts
import mongoose, { Schema, InferSchemaType } from 'mongoose';

const SaleItemSchema = new Schema(
  {
    supplementId: { type: Schema.Types.ObjectId, ref: 'Supplement' },
    name: String,
    qty: Number,
    price: Number, // unit price at time of sale
  },
  { _id: false }
);

const PaymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['cash', 'card', 'upi', 'bank'], default: 'upi' },
    description: String,
    status: { type: String, enum: ['paid', 'refunded', 'cancelled'], default: 'paid' },

    // line items for supplement purchases
    meta: {
      items: [SaleItemSchema],
    },
  },
  { timestamps: true }
);

export type Payment = InferSchemaType<typeof PaymentSchema>;

// IMPORTANT: reuse existing model in dev to avoid OverwriteModelError
export default (mongoose.models.Payment as mongoose.Model<Payment>) ||
  mongoose.model<Payment>('Payment', PaymentSchema);
