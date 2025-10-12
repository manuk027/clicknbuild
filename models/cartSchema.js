import mongoose from "mongoose";
const { Schema, model } = mongoose;

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

const Cart = model("Cart", cartSchema);
export default Cart;
