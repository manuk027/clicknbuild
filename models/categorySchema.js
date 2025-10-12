import mongoose from "mongoose";
const { Schema, model } = mongoose;

const categorySchema = new Schema({
    name: { type: String, required: true, },
    description: { type, String, required: true, },
    maxOffer: { type: Number, required: true, },
    isListed: { type: Boolean, required: true },
    image: { type: String, required: true, },

}, { timestamps: true });

const Category = model("Category", categorySchema);
export default Category; 