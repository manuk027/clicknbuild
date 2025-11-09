//importing necessary modules and functions
import mongoose from "mongoose";



const { Schema, model } = mongoose;

const itemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, required: true, },
    addedAt: { type: Date, default: Date.now }
})

//defining wishlist Schem
const wishlistSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, },
    items: [itemSchema]
}, { timestamps: true });



//creating model for wishlist
const Wishlist = mongoose.models.Wishlist || model("Wishlist", wishlistSchema);
export default Wishlist;