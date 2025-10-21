//importing necessary modules and functions
import mongoose from "mongoose";


const { Schema, model } = mongoose;


//defining brand schema for admin
const brandSchema = new Schema({
    name: { type: String, required: true, },
    image: { type: String, required: true, },
}, { timestamps: true });


//creating model for Brand
const Brand = model("Brand", brandSchema);
export default Brand;