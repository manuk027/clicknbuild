//importing necessary modules and functions
import mongoose, { disconnect } from 'mongoose';



const { Schema, model } = mongoose;



//defining coupon schema 
const couponSchema = new Schema({
    name: { type: String, required: true, },
    code: { type: String, required: true, },
    discount: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true, default: () => Date.now() + 30 * 24 * 60 * 60 * 1000 },
    minimumPurchase: { type: Number, required: true, },
    isListed: { type: Boolean, default: true, },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });



//creating model for Coupon
const Coupon = model('Coupon', couponSchema);
export default Coupon;