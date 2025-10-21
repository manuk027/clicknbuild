//importing necessary modules and functions
import mongoose from "mongoose";


const { Schema, model } = mongoose;


//defining cart schema for the user
const cartSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, },
    items: [{
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, },
        quantity: { type: Number, default: 1, },
        price: { type: Number, required: true, },
        totalPrice: { type: Number, required: true, },
        status: { type: String, default: "Order Placed", },
        cancellationReason: { type: String, defult: "None" },
    }]
});


//creating model for the Cart
const Cart = model("Cart", cartSchema);
export default Cart;
