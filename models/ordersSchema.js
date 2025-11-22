//importing necessary modules and functions
import mongoose from "mongoose";



const { Schema, model } = mongoose;

const transactionsSchema = new Schema({
    _id: false,
    amount: { type: Number },
    paymentMethod: { type: String, enum: ["COD", "Online", "Wallet"], },
    paymentType: { type: String, },
    status: { type: String, enum: ["Pending", "Paid", "Refunded"], default: "pending" },
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
    status: { type: String, enum: ["Pending", "Processing", "Out for delivery", "Delivered", "Cancelled", "Return requested", "Returned",], default: "Pending", },
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
    paymentMethod: { type: String, enum: ["COD", "Online", "Wallet"], required: true, },
    paymentStatus: { type: String, enum: ["pending", "paid", "completed", "refunded", "failed"], default: "pending" },
    transaction: transactionsSchema,
    orderStatus: { type: String, enum: ["Pending", "Processing", "Out for delivery", "Cancelled", "Returned", "Return requested", "Delivered"], defualt: "Pending", },
    orderDate: { type: Date, default: Date.now, },
    appliedOffer: { type: Schema.Types.ObjectId, ref: "Coupon", default: null },
    deliveryDate: { type: Date }
}, { timestamps: true });



//creating model for Order
const Order = mongoose.models.Order || model("Order", orderSchema);
export default Order;
