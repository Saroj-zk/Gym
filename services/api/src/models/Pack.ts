import mongoose, { Schema, InferSchemaType } from 'mongoose';

const PackSchema = new Schema({
  name: { type: String, unique: true },
  durationType: { type: String, enum: ['days','months','sessions'], default: 'months' },
  durationValue: { type: Number, default: 1 },
  price: { type: Number, default: 0 },
  description: String,
  features: [String],
  discountOptions: Schema.Types.Mixed,
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

export type Pack = InferSchemaType<typeof PackSchema>;
export default mongoose.model('Pack', PackSchema);
