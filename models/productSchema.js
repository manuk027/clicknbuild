//importing necessary modules and functions
import mongoose from "mongoose";



const { Schema, model } = mongoose;


const variantSchema = new mongoose.Schema({
    variant: { type: String, required: true, },
    quantity: { type: Number, required: true, },
    price: { type: Number, required: true, },
    offer: { type: Number, required: true, },
});

const specificationSchema = new mongoose.Schema({
    title: { type: String, required: true, },
    details: { type: String, required: true, },
})


//defining product schema
const productSchema = new Schema({
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true, },
    model: { type: String, required: true, },
    description: { type: String, required: true, },
    isListed: { type: Boolean, required: true, default: true, },
    images: { type: [String], required: true, },
    variants: [variantSchema],
    specification: [specificationSchema],
    isComponent: { type: Boolean, required: true, },
    isPeripheral: { type: Boolean, required: true, },
    onFlashSale: { type: Boolean, required: true, },
    isLimited: { type: Boolean, required: true, },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, },
    rating: { type: Number, required: true, },
}, { timestamps: true })



//creating model for Product
const Product = model("Product", productSchema);
export default Product;