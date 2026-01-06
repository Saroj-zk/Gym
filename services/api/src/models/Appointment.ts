import mongoose, { Schema, InferSchemaType } from 'mongoose';

const AppointmentSchema = new Schema({
    type: { type: String, enum: ['physio', 'pt', 'gynecologist', 'consultation'], required: true },

    userId: { type: String, ref: 'User' }, // The member booked
    memberName: String, // Snapshot of name

    providerName: String, // e.g. "Dr. Smith" or "Trainer John"

    date: { type: String, required: true }, // YYYY-MM-DD
    timeSlot: { type: String, required: true }, // e.g. "10:00 AM"

    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
    notes: String,
}, { timestamps: true });

type Appointment = InferSchemaType<typeof AppointmentSchema>;
const AppointmentModel = mongoose.models.Appointment || mongoose.model('Appointment', AppointmentSchema);
export default AppointmentModel;
export type { Appointment };
