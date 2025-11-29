import User from '../../models/userSchema.js';
import Category from '../../models/categorySchema.js';
import Wallet from '../../models/walletSchema.js';
import { razorpay } from '../../config/razorPay.js'
import dotenv from 'dotenv';
import crypto from 'crypto';
import { HttpStatus } from '../../helpers/statusCodes.js';


dotenv.config();



export const loadWalletService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const user = await User.findOne({ _id: userId });
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        const walletTransactions = await Wallet.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const totalTransactions = await Wallet.countDocuments({ userId });
        const totalPages = Math.ceil(totalTransactions / limit);
        const lastWalletEntry = await Wallet.findOne({ userId }).sort({ createdAt: -1 });
        const currentBalance = lastWalletEntry ? lastWalletEntry.currentBalance : 0;
        return res.render("wallet", { peripheral, component, user, wallet: walletTransactions, currentBalance, current: page, pages: totalPages, });
    } catch (error) {
        console.error("Error loading Wallet page :", error);
        return res.redirect("/pageNotFound");
    }
};



export const createOrderService = async (req, res) => {
    try {
        const { amount } = req.body;
        const options = {
            amount: amount * 100,
            currency: "INR",
            receipt: "wallet_" + Date.now(),
        };
        const order = await razorpay.orders.create(options);
        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
        })
    } catch (error) {
        console.error(error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, msg: "Server error" });
    }
}



export const verifyPaymentService = async (req, res) => {
    try {
        const { paymentData, amount } = req.body;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, } = paymentData;
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac("sha256", process.env.RZP_TEST_SECRET).update(sign).digest("hex");
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, msg: "Invalild signature" });
        }
        const userId = req.user?._id || req.session?.user;
        const lastWalletEntry = await Wallet.findOne({ userId }).sort({ createdAt: -1 });
        const previousBalance = lastWalletEntry ? lastWalletEntry.currentBalance : 0;
        const newBalance = previousBalance + amount / 100;
        await Wallet.create({
            transactionId: razorpay_payment_id,
            userId,
            type: "CREDIT",
            amount: amount / 100,
            orderId: null,
            previousBalance,
            currentBalance: newBalance,
        })
        return res.json({ success: true, msg: "Money added to wallet" });
    } catch (error) {
        console.error(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, msg: "Server error" });
    }
}