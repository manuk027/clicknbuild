//importing necessary modules and functions
import mongoose from 'mongoose';



const { Schema, model } = mongoose;



//defining coupon schema 
const couponSchema = new Coupon({
    name: { type: String, unique: true, required: true, },
    code: { type: String, unique: true, required: true, },
    offerPrice: { type: Number, required: true, default: 0 },
    expiryDate: { type: Date, required: true, },
    minimumPurchase: { type: Number, required: true, },
    isListed: { type: Boolean, default: true, },
    userId: { type: Schema.Types.ObjectId, required: true, },
});



//creating model for Coupon
const Coupon = model('Coupon', couponSchema);
export default Coupon;