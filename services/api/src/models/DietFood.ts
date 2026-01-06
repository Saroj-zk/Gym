import mongoose, { Schema, InferSchemaType } from 'mongoose';

const DietFoodSchema = new Schema({
    name: { type: String, required: true },
    calories: { type: Number, required: true }, // kcal
    protein: { type: Number, default: 0 }, // g
    carbs: { type: Number, default: 0 }, // g
    fats: { type: Number, default: 0 }, // g

    servingSize: { type: String }, // e.g. "100g", "1 bowl"

    category: { type: String, default: 'meal' }, // meal, snack, drink, ingredient
    isVegetarian: { type: Boolean, default: false },
    isVegan: { type: Boolean, default: false },

    price: { type: Number, default: 0 }, // if purchasable
    isPurchasable: { type: Boolean, default: false },

    imageUrl: String,
}, { timestamps: true });

type DietFood = InferSchemaType<typeof DietFoodSchema>;
const DietFoodModel = mongoose.models.DietFood || mongoose.model('DietFood', DietFoodSchema);
export default DietFoodModel;
export type { DietFood };
