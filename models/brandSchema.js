//importing necessary modules and functions
import mongoose from "mongoose";


const { Schema, model } = mongoose;


//defining brand schema for admin
const brandSchema = new Schema({
    name: { type: String,},
    image: { type: String, },
    isListed: {type: Boolean, },
}, { timestamps: true });


//creating model for Brand
const Brand = model("Brand", brandSchema);
export default Brand;