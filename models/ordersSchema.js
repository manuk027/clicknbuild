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
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "products", },
    variantId: { type: String, },
    name: { type: String, },
    sku: { type: String, },
    price: { type: Number, },
    salePrice: { type: Number, },
    quantity: { type: Number, },
    subTotal: { type: Number, },
    appliedOffer: { type: String },
    category: { type: String, },
    coverImage: { type: String },
    status: { type: String, enum: ["pending", "processing", "out-for-delivery", "delivered", "cancelled", "return-requested", "returned",], default: "pending", },
    refundAmount: { type: Number, default: 0 },
    cancelReason: { type: String, default: "none" },
    returnReason: { type: String, default: "none" },
    returnApprove: { type: Boolean, default: false }
});

const addressSchema = new Schema({
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true, },
    address: { type: String, required: true, },
    district: { type: String, rquired: true, },
    state: { type: String, required: true, },
    city: { type: String, required: true, },
    pincode: { type: String, required: true, },
    landmark: { type: String, required: true, },
})


//defining order schema
const orderSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "Product", },
    orderId: { type: String, unique: true, },
    items: [itemSchema,],
    address: addressSchema,
    subTotal: { type: Number, },
    taxAmount: { type: Number, },
    deliveryFee: { type: Number, },
    totalAmount: { type: Number, },
    returnReason: { type: String },
    paymentMethod: { type: String, enum: ["COD", "Razorpay", "Wallet"], required: true, },
    paymentStatus: { type: String, enum: ["pending", "paid", "completed", "refunded", "failed"], default: "pending" },
    // transactions: [transactionsSchema,],
    orderStatus: { type: String, enum: ["Pending", "Processing", "Out for delivery", "cancelled", "Returned", "return-requested", "delivered"], defualt: "Pending", },
    orderDate: { type: Date, default: Date.now, },
    deliveryDate: { type: Date }
}, { timestamps: true });



//creating model for Order
const Order = mongoose.Model.$where.Orders || model("Order", orderSchema);
export default Order;