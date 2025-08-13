import mongoose, { Schema, InferSchemaType } from 'mongoose';

const AttendanceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  timestamp: { type: Date, default: () => new Date() },
  method: { type: String, enum: ['qr','manual','kiosk','face'], default: 'manual' },
  deviceId: String,
  notes: String,
}, { timestamps: true });

export type Attendance = InferSchemaType<typeof AttendanceSchema>;
export default mongoose.model('Attendance', AttendanceSchema);
