//importing necessary modules and functions
import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';



const { Schema, model } = mongoose;



//defining order schema
const orderSchema = new Schema({
    orderId: { type: String, default: () => uuidv4(), unique: true, },
    orderedItems: [{
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true, },
        quantity: { type: Number, default: 1, },
        price: { type: Number, default: 0, },
    }],
    address: { type: Schema.Types.ObjectId, ref: "Address", required: true },
    date: { type: Date, required: true },
    totalPrice: { type: Number, default: 0, },
    discount: { type: Number, default: 0, },
    finalAmount: { type: Number, default: 0 },
    status: { type: String, required: true, enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Return Request", "Returned"], },
    couponApplied: { type: Boolean, default: false, },
}, { timestamps: true });



//creating model for Order
const Order = model("Order", orderSchema);
export default Order;