//importing necessary modules and functions
import mongoose from "mongoose";



const { Schema, model } = mongoose;


const itemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, },
    variantId: { type: Schema.Types.ObjectId, required: true, },
    // SKU: { type: String, required: true, },
    max: { type: Number, default: 5 },
    quantity: { type: Number, default: 1, },
    subTotal: { type: Number, default: 0, },
    addedAt: { type: Date, default: Date.now, }
})


//defining cart schema for the user
const cartSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, },
    items: [itemSchema],
    totalAmount: { type: Number, default: 0, },
}, { timestamps: true });



//creating model for the Cart
const Cart = mongoose.models.Cart || model("Cart", cartSchema);
export default Cart;
