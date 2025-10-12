import mongoose from "mongoose";
const { Schema, model } = mongoose;

const userSchema = new Schema({
    fullName: { type: String, required: true, },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: false, unique: true, default: null },
    googleId: { type: String, unique: true, },
    password: { type: String, required: false, },
    referedBy: { type: String, required: false, },
    referalCode: { type: String, required: true, unique: true },
    address: { addressId: String, required: false, unique: true, },
    isBlocked: { type: Boolean, default: false, required: true, },
    isAdmin: { type: Boolean, default: false, },
    cart: [{ type: Schema.Types.ObjectId, ref: "Cart", }],
    walletBalance: { type: Number, default: 0, },
    whishlist: { type: Schema.Types.ObjectId, ref: "wishlist", },
    orders: [{ type: Schema.Types.ObjectId, ref: "Orders", }],
    createdAt: { type: Date, required: true, default: Date.now, },
    updatedAt: { type: Date, required: true, default: Date.now, },

});

const User = model("User", userSchema);
export default User;