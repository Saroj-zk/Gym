// services/api/src/models/WorkoutPlan.ts
import mongoose, { Schema, model } from 'mongoose';

const ExerciseSchema = new Schema(
  { name: { type: String, required: true }, sets: Number, reps: String, notes: String },
  { _id: false }
);

const WorkoutPlanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    weekStart: { type: Date, required: true }, // Monday 00:00 of that week
    days: {
      mon: { type: [ExerciseSchema], default: [] },
      tue: { type: [ExerciseSchema], default: [] },
      wed: { type: [ExerciseSchema], default: [] },
      thu: { type: [ExerciseSchema], default: [] },
      fri: { type: [ExerciseSchema], default: [] },
      sat: { type: [ExerciseSchema], default: [] },
      sun: { type: [ExerciseSchema], default: [] },
    },
  },
  { timestamps: true, collection: 'workout_plans' }
);

WorkoutPlanSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

// IMPORTANT: use mongoose.models here (not a named import)
const WorkoutPlan =
  (mongoose.models.WorkoutPlan as mongoose.Model<any>) || model('WorkoutPlan', WorkoutPlanSchema);

export default WorkoutPlan;
