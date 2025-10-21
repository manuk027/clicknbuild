//importing necessary modules and functions
import mongoose from "mongoose";


const { Schema, model } = mongoose;


//defining category schema for the products
const emailOtpSchema = new mongoose.Schema({
    email: { type: String, required: true, },
    otp: { type: String, required: true, },
    createdAt: { type: Date, default: Date.now, expires: 120 }
});


//creating model for OTP
const emailOtp = mongoose.model("emailOtp", emailOtpSchema);
export default emailOtp;
