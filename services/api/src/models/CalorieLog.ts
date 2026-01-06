import mongoose, { Schema, InferSchemaType } from 'mongoose';

const LogItemSchema = new Schema({
    foodName: String,
    calories: Number,
    protein: Number,
    carbs: Number,
    fats: Number,
    qty: { type: Number, default: 1 },
});

const CalorieLogSchema = new Schema({
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    items: [LogItemSchema],
    totalCalories: { type: Number, default: 0 },
    weightLogged: { type: Number }, // User's weight on this day
}, { timestamps: true });

// Compound index for unique log per user per day
CalorieLogSchema.index({ userId: 1, date: 1 }, { unique: true });

type CalorieLog = InferSchemaType<typeof CalorieLogSchema>;
const CalorieLogModel = mongoose.models.CalorieLog || mongoose.model('CalorieLog', CalorieLogSchema);
export default CalorieLogModel;
export type { CalorieLog };
