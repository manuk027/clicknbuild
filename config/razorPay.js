import Razorpay from "razorpay";
import dotenv from 'dotenv';

dotenv.config();

export const razorpay = new Razorpay({
    key_id: process.env.RZP_TEST_KEY,
    key_secret: process.env.RZP_TEST_SECRET
});
