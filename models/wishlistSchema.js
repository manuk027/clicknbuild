import mongoose from "mongoose";
const { Schema, model } = mongoose;

const wishlistSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, },
    productId: { type: Schema.Types.ObjectId, ref: "User", required: true, },
}, { timestamps: true });

const Wishlist = model("Wishlist", wishlistSchema);
export default Wishlist;