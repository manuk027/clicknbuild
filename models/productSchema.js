import mongoose from "mongoose";
const { Schema, model } = mongoose;

const productSchema = new Schema({
    brand: { type: String, required: true, },
    model: { type: String, required: true, },
    description: { type: String, required: true, },
    isListed: { type: Boolean, required: true, default: true, },
    images: { type: [String], required: true, },
    variants: [{
        variant: {
            type: String, required: true,
        },
        quantity: {
            type: Number, required: true,
        },
        price: {
            type: Number, required: true,
        },
        offer: {
            type: Number, required: true,
        }
    }],
    specification: [{
        title: {
            type: String, required: true,
        },
        details: {
            type: String, required: true,
        }
    }],
    isComponent: { type: Boolean, required: true, },
    isPeripheral: { type: Boolean, required: true, },
    onFlashSale: { type: Boolean, required: true, },
    isLimited: { type: Boolean, required: true, },
    category: {
        type: Schema.Types.ObjectId,
        ref: "category",
        required: true,
    },
    rating: { type: Number, required: true, },
}, { timestamps: true })

const Product = model("Product", productSchema);
export default Product;