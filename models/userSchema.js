//importing necessary modules and functions
import mongoose from "mongoose";
import bcrypt from "bcryptjs";



const { Schema, model } = mongoose;



// defining user schema
const userSchema = new Schema({
    fullName: { type: String, required: true, },
    profilePhoto: {type: String},
    email: { type: String, required: true, unique: true, },
    phoneNumber: { type: String, },
    googleId: { type: String,},
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



userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});



userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};



//creating model for User
const User = model("User", userSchema);
export default User;