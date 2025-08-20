import mongoose, { Schema } from 'mongoose';

const SettingSchema = new Schema(
  {
    key: { type: String, unique: true, index: true },
    value: Schema.Types.Mixed, // e.g. { seasonStart: Date }
  },
  { timestamps: true }
);

export default mongoose.model('Setting', SettingSchema);
