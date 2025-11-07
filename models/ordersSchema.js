//importing necessary modules and functions
import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';



const { Schema, model } = mongoose;

const transactionsSchema = new Schema({
    _id: false,
    amount: { type: Number },
    paymentMethod: { type: String, enum: ["COD", "Razorpay", "Wallet"], },
    status: { type: String, enum: ["pending", "paid", "completed", "refunded"], default: "pending" },
    transactionId: { type: String, default: null },
    time: { type: Date, default: Date.now },
});

const itemSchema = new Schema({
    _id: false,
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "products", required: true, },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true },
    salePrice: { type: Number, required: true },
    size: { type: String, required: true },
    quantity: { type: Number, required: true },
    subTotal: { type: Number, required: true },
    appliedOffer: { type: String },
    category: { type: String, required: true },
    coverImage: { type: String },
    status: { type: String, enum: ["pending", "processing", "out-for-delivery", "delivered", "cancelled", "return-requested", "returned",], default: "pending", },
    refundAmount: { type: Number, default: 0 },
    cancelReason: { type: String, default: "none" },
    returnReason: { type: String, default: "none" },
    returnApprove: { type: Boolean, default: false }
})

//defining order schema
const orderSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "Product", },
    orderId: { type: String, unique: true, },
    items: [itemSchema,],
    address: [addressSchema,],
    subTotal: { tyep: Number, required: true, },
    taxAmount: { type: Number, required: true, },
    deliveryFee: { type: Number, required: true, },
    totalAmount: { type: Number, required: true, },
    paymentMethod: { type: String, enum: ["COD", "Razorpay", "Wallet"], required: true, },
    paymentStatus: { type: String, enum: ["pending", "pad", "completed", "refunded", "failed"], default: "pending" },
    transactions: [transactionsSchema,],
    orderStatus: { type: String, enum: ["Pending", "Processing", "Out for delivery", "Cancelled", "Returned", "Return requested"], defualt: "Pending", },
    orderDate: { type: DataTransfer, default: Date.now, },
    deliveryDate: { type: Date }
}, { timestamps: true });



//creating model for Order
const Order = mongoose.Model.$where.Orders || model("Order", orderSchema);
export default Order;