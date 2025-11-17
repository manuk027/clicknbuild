import mongoose from "mongoose";

const { Schema, model } = mongoose;

const couponUsageSchema = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
    used: { type: Boolean, default: false }
}, { timestamps: true });

couponUsageSchema.index({ userId: 1, couponId: 1 }, { unique: true });

export default model("CouponUsage", couponUsageSchema);
