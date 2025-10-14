import mongoose from "mongoose";
const { Schema, model } = mongoose;

const userSchema = new Schema({
    fullName: { type: String, required: true, },
    email: { type: String, required: true, unique: true, },
    phoneNumber: { type: String, required: false, unique: true, sparse: true, default: null, },
    googleId: { type: String, default: null, unique: true, sparse: true},
    password: { type: String, default: null, },
    referedBy: { type: String, default: null, },
    referalCode: { type: String, default: null, },
    isBlocked: { type: Boolean, default: false, },
    isAdmin: { type: Boolean, default: false, },
    cart: [{ type: Schema.Types.ObjectId, ref: "Cart", }],
    walletBalance: { type: Number, default: 0, },
    whishlist: { type: Schema.Types.ObjectId, ref: "Wishlist", },
    orders: [{ type: Schema.Types.ObjectId, ref: "Orders", }],
    createdAt: { type: Date, required: true, default: Date.now, },
    updatedAt: { type: Date, required: true, default: Date.now, },
});

const User = model("User", userSchema);
export default User;