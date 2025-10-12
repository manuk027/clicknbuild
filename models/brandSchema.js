import mongoose from "mongoose";
const { Schema, model } = mongoose;

const brandSchema = new Schema({
    name: { type: String, required: true, },
    image: { type: String, required: true, },
}, { timestamps: true });

const Brand = model("Brand", brandSchema);
export default Brand;