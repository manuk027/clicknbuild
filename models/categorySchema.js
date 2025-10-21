//importing necessary modules and functions
import mongoose from "mongoose";


const { Schema, model } = mongoose;


//defining category schema for the product
const categorySchema = new Schema({
    name: { type: String, required: true, },
    description: { type: String, },
    maxOffer: { type: Number, default: 0, },
    isListed: { type: Boolean, default: true, },
    image: { type: String, },

}, { timestamps: true });


//creating model for Category
const Category = model("Category", categorySchema);
export default Category; 