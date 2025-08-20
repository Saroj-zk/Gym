import mongoose, { Schema, InferSchemaType } from 'mongoose';

const SupplementSchema = new Schema({
  name: { type: String, required: true, index: true },
  sku: { type: String, index: true, unique: true, sparse: true },
  category: { type: String },          // e.g., Protein, Pre-Workout, Creatine, Apparel
  supplier: { type: String },

  purchasePrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },

  stockQty: { type: Number, default: 0 },
  unit: { type: String, default: 'pieces' },  // kg | pieces | servings

  imageUrl: { type: String },           // absolute URL
  description: { type: String },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

type Supplement = InferSchemaType<typeof SupplementSchema>;
const SupplementModel = mongoose.models.Supplement || mongoose.model('Supplement', SupplementSchema);
export default SupplementModel;
export type { Supplement };
