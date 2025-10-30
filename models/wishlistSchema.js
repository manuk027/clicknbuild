//importing necessary modules and functions
import mongoose from "mongoose";



const { Schema, model } = mongoose;



//defining wishlist Schem
const wishlistSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, },
    productId: { type: Schema.Types.ObjectId, ref: "User", required: true, },
}, { timestamps: true });



//creating model for wishlist
const Wishlist = model("Wishlist", wishlistSchema);
export default Wishlist;