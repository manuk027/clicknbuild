import User from '../../models//userSchema.js'
import Category from '../../models/categorySchema.js'
import Order from '../../models/ordersSchema.js'
import Product from '../../models/productSchema.js';
import Wallet from '../../models/walletSchema.js';
import { v4 as uuidv4 } from "uuid";
import { HttpStatus } from '../../helpers/statusCodes.js';
import mongoose from 'mongoose';



export const loadOrdersService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const user = await User.findById(userId);
        const page = parseInt(req.query.page) || 1;
        const limit = 1;
        const skip = (page - 1) * limit;
        const search = req.query.search?.trim();
        let orders = await Order.find({ userId }, { items: 1, orderId: 1, deliveryDate: 1, orderDate: 1, totalAmount: 1, deliveryFee: 1, address: 1, paymentMethod: 1, orderStatus: 1, }).sort({ orderDate: -1 }).lean();
        let allItems = orders.flatMap(order => order.items.map(item => ({ ...item, orderId: order.orderId, deliveryDate: order.deliveryDate, orderDate: order.orderDate, totalAmount: order.totalAmount, deliveryFee: order.deliveryFee, address: order.address, paymentMethod: order.paymentMethod, orderStatus: order.orderStatus, })));
        if (search) allItems = allItems.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
        const grouped = {};
        allItems.forEach(item => {
            if (!grouped[item.orderId]) grouped[item.orderId] = { orderId: item.orderId, deliveryDate: item.deliveryDate, orderDate: item.orderDate, totalAmount: item.totalAmount, deliveryFee: item.deliveryFee, address: item.address, paymentMethod: item.paymentMethod, orderStatus: item.orderStatus, items: [] };
            grouped[item.orderId].items.push(item);
        });
        let finalOrders = Object.values(grouped);
        const totalOrders = finalOrders.length;
        const totalPages = Math.ceil(totalOrders / limit);
        finalOrders = finalOrders.slice(skip, skip + limit);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        return res.render("orders", { user, peripheral, component, allOrders: finalOrders, current: page, pages: totalPages, search });
    } catch (error) {
        console.error("Error loading the orders page:", error);
        return res.redirect("/pageNotFound");
    }
};



export const cancelOrderService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const { orderId } = req.body;
        if (!orderId) return res.json({ success: false, message: "Invalid Order ID!" });
        const order = await Order.findOne({ orderId, userId });
        if (!order) return res.json({ success: false, message: "Order not found!" });
        if (order.orderStatus === "Delivered") return res.json({ success: false, message: "Delivered orders cannot be cancelled." });
        let refundableAmount = 0;
        const hasOutForDeliveryItem = order.items.some(item => item.status === "Out for delivery");
        const hasDeliveredItem = order.items.some(item => item.status === "Delivered");
        for (let item of order.items) {
            if (item.status === "Pending") {
                await Product.updateOne({ _id: item.productId, "variants._id": item.variantId }, { $inc: { "variants.$.quantity": item.quantity } });
                refundableAmount += item.subTotal ?? (item.salePrice * item.quantity);
                item.status = "Cancelled";
            }
            else if (item.status === "Out for delivery") {
                await Product.updateOne({ _id: item.productId, "variants._id": item.variantId }, { $inc: { "variants.$.quantity": item.quantity } });
                refundableAmount += item.subTotal ?? (item.salePrice * item.quantity);
                item.status = "Cancelled";
            }
            else if (item.status === "Delivered") {
                continue;
            }
        }
        if (!hasOutForDeliveryItem && !hasDeliveredItem) refundableAmount += order.deliveryFee || 0;
        order.orderStatus = "Cancelled";
        await order.save();
        const paymentMethod = order.paymentMethod?.toLowerCase();
        const isWalletRefundAllowed = paymentMethod === "online" || paymentMethod === "wallet";
        if (isWalletRefundAllowed && refundableAmount > 0) {
            const lastWalletEntry = await Wallet.findOne({ userId }).sort({ createdAt: -1 });
            const previousBalance = lastWalletEntry ? lastWalletEntry.currentBalance : 0;
            const newBalance = previousBalance + refundableAmount;
            await Wallet.create({ transactionId: uuidv4(), userId, type: "CREDIT", amount: refundableAmount, orderId: order.orderId, previousBalance, currentBalance: newBalance, });
            return res.json({ success: true, message: "Order cancelled & refund credited to wallet", refundedAmount: refundableAmount, currentWalletBalance: newBalance });
        }
        return res.json({ success: true, message: "Order cancelled successfully", refundedAmount: 0 });
    } catch (error) {
        console.error("Error cancelling the order:", error);
        return res.redirect('/pageNotFound');
    }
};



export const cancelProductService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const { itemId, orderId } = req.body;
        if (!orderId || !itemId || !mongoose.Types.ObjectId.isValid(itemId)) return res.json({ success: false, message: "Invalid Order or Item ID!" });
        const order = await Order.findOne({ orderId, userId });
        if (!order) return res.json({ success: false, message: "Order not found!" });
        const item = order.items.id(itemId);
        if (!item) return res.json({ success: false, message: "Item not found!" });
        if (item.status === "Delivered") return res.json({ success: false, message: "Delivered product cannot be cancelled." });
        if (!["Pending", "Out for delivery"].includes(item.status)) return res.json({ success: false, message: "This product cannot be cancelled." });
        let refundAmount = 0;
        if (["Pending", "Out for delivery"].includes(item.status)) {
            await Product.updateOne({ _id: item.productId, "variants._id": item.variantId }, { $inc: { "variants.$.quantity": item.quantity } });
            refundAmount = item.subTotal ?? (item.salePrice * item.quantity);
        }
        item.status = "Cancelled";
        let currentBalance = null;
        const paymentMethod = order.paymentMethod?.toLowerCase();
        const isWalletRefundAllowed = paymentMethod === "online" || paymentMethod === "wallet";
        if (isWalletRefundAllowed && refundAmount > 0) {
            const lastTransaction = await Wallet.findOne({ userId }).sort({ createdAt: -1 });
            const previousBalance = lastTransaction ? lastTransaction.currentBalance : 0;
            const newBalance = previousBalance + refundAmount;
            await Wallet.create({ transactionId: uuidv4(), userId, type: "CREDIT", amount: refundAmount, orderId: order.orderId, previousBalance, currentBalance: newBalance, });
            currentBalance = newBalance;
        }
        const allCancelled = order.items.every(i => i.status === "Cancelled");
        if (allCancelled) order.orderStatus = "Cancelled";
        await order.save();
        const message = isWalletRefundAllowed ? `Product cancelled & ₹${refundAmount} credited to your wallet.` : "Product cancelled successfully.";
        return res.json({ success: true, message, refunded: isWalletRefundAllowed ? refundAmount : 0, currentWalletBalance: currentBalance });
    } catch (error) {
        console.error("Error cancelling the product:", error);
        return res.status(500).json({ success: false, message: "Internal server error", });
    }
};



export const returnItemService = async (req, res) => {
    try {
        const { orderId, itemId, reason } = req.body;
        if (!orderId || !itemId || !reason) return res.json({ success: false, message: "Missing required fields." });
        const order = await Order.findOne({ orderId });
        if (!order) return res.json({ success: false, message: "Order not found." });
        const item = order.items.id(itemId);
        if (!item) return res.json({ success: false, message: "Item not found." });
        if (item.status !== "Delivered") return res.json({ success: false, message: "Only delivered items can be returned." });
        item.status = "Return requested";
        item.returnReason = reason;
        const allRequested = order.items.every(i => i.status === "Return requested");
        if (allRequested) { order.orderStatus = "Return requested"; order.returnReason = reason; }
        await order.save();
        return res.json({ success: true, message: "Return request submitted for the item!" });
    } catch (error) {
        console.error("returnItemService error:", error);
        return res.redirect('/pageNotFound');
    }
};



export const returnOrderService = async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        if (!orderId || !reason) return res.json({ success: false, message: "Missing required fields." });
        const order = await Order.findOne({ orderId });
        if (!order) return res.json({ success: false, message: "Order not found." });
        const allDelivered = order.items.every(item => item.status === "Delivered");
        if (!allDelivered) return res.json({ success: false, message: "Only fully delivered orders can be returned." });
        for (let item of order.items) {
            item.status = "Return requested";
            item.returnReason = reason;
        }
        order.orderStatus = "Return requested";
        order.returnReason = reason;
        await order.save();
        return res.json({ success: true, message: "Return request submitted for the entire order." });
    } catch (error) {
        console.error("returnOrderService error:", error);
        return res.redirect('/pageNotFound');
    }
};



export const loadReferAndEarnService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const user = await User.findOne({ _id: userId });
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        return res.render('referEarn', { peripheral, component, user });
    } catch (error) {
        console.error("Error loading Refer and earn page : ", error);
        return res.redirect('/pageNotFound');
    }
}