import User from '../../models//userSchema.js'
import Category from '../../models/categorySchema.js'
import Order from '../../models/ordersSchema.js'
import Product from '../../models/productSchema.js';
import Wallet from '../../models/walletSchema.js';
import { v4 as uuidv4 } from "uuid";
import { HttpStatus } from '../../helpers/statusCodes.js';



export const loadOrdersService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const user = await User.findById(userId);
        const page = parseInt(req.query.page) || 1;
        const limit = 1;
        const skip = (page - 1) * limit;
        const search = req.query.search?.trim();
        let orders = await Order.find({ userId }, { items: 1, orderId: 1, deliveryDate: 1, orderDate: 1, totalAmount: 1, deliveryFee: 1, address: 1, paymentMethod: 1, orderStatus: 1, }).sort({ orderDate: -1 }).lean();
        let allItems = orders.flatMap(order =>
            order.items.map(item => ({
                ...item,
                orderId: order.orderId,
                deliveryDate: order.deliveryDate,
                orderDate: order.orderDate,
                totalAmount: order.totalAmount,
                deliveryFee: order.deliveryFee,
                address: order.address,
                paymentMethod: order.paymentMethod,
                orderStatus: order.orderStatus,
            }))
        );
        if (search) {
            allItems = allItems.filter(item =>
                item.name.toLowerCase().includes(search.toLowerCase())
            );
        }
        const grouped = {};
        allItems.forEach(item => {
            if (!grouped[item.orderId]) {
                grouped[item.orderId] = {
                    orderId: item.orderId,
                    deliveryDate: item.deliveryDate,
                    orderDate: item.orderDate,
                    totalAmount: item.totalAmount,
                    deliveryFee: item.deliveryFee,
                    address: item.address,
                    paymentMethod: item.paymentMethod,
                    orderStatus: item.orderStatus,
                    items: []
                };
            }
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
        if (!orderId) {
            return res.json({ success: false, message: "Order not found!" });
        }
        const order = await Order.findOne({ userId, orderId });
        if (!order) {
            return res.json({ success: false, message: "Order not found!" });
        }
        if (order.items.some(item => item.status === "Delivered")) {
            return res.json({
                success: false,
                message: "Delivered items cannot be cancelled"
            });
        }
        for (let item of order.items) {
            await Product.updateOne({ _id: item.productId, "variants._id": item.variantId }, { $inc: { "variants.$.quantity": item.quantity } });
        }
        order.items = order.items.map(item => ({ ...item, status: "Cancelled", }));
        order.orderStatus = "Cancelled";
        const walletRefundAmount = order.totalAmount;
        const lastWalletEntry = await Wallet.findOne({ userId }).sort({ createdAt: -1 });
        const previousBalance = lastWalletEntry ? lastWalletEntry.currentBalance : 0;
        const newBalance = previousBalance + walletRefundAmount;
        await Wallet.create({
            transactionId: uuidv4(),
            userId: userId,
            type: "CREDIT",
            amount: walletRefundAmount,
            orderId: order._id,
            previousBalance,
            currentBalance: newBalance,
        });
        await order.save();
        return res.json({ success: true, message: "Order Cancelled & Amount Credited to Wallet" });
    } catch (error) {
        console.error("Error canceling the order:", error);
        return res.redirect('/pageNotFound');
    }
};



export const cancelProductService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const { itemId, orderId } = req.body;
        const order = await Order.findOne({ _id: orderId, userId });
        if (!order) {
            return res.json({ success: false, message: "Order not found!" });
        }
        const item = order.items.id(itemId);
        if (!item) {
            return res.json({ success: false, message: "Item not found!" });
        }
        await Product.updateOne({ _id: item.productId, "variants._id": item.variantID }, { $inc: { "variants.$.quantity": item.quantity } });
        item.status = "Cancelled";
        const refundAmount = item.price * item.quantity;
        const lastTransaction = await Wallet.findOne({ userId }).sort({ createdAt: -1 }).lean();
        const previousBalance = lastTransaction ? lastTransaction.currentBalance : 0;
        const currentBalance = previousBalance + refundAmount;
        await Wallet.create({
            transactionId: uuidv4(),
            userId,
            type: "CREDIT",
            amount: refundAmount,
            orderId: orderId,
            previousBalance: previousBalance,
            currentBalance: currentBalance,
        });
        const allCancelled = order.items.every(i => i.status === "Cancelled");
        if (allCancelled) {
            order.orderStatus = "Cancelled";
        }
        await order.save();
        return res.json({
            success: true, message: `Product cancelled and ₹${refundAmount} has been added to your wallet.`, refunded: refundAmount, currentWalletBalance: currentBalance
        });
    } catch (error) {
        console.error("Error canceling the product:", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal server error",
        });
    }
};



export const returnItemService = async (req, res) => {
    try {
        const { orderId, itemId, reason } = req.body;
        if (!orderId || !itemId || !reason) {
            return res.json({ success: false, message: "Missing required fields." });
        }
        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.json({ success: false, message: "Order not found." });
        }
        const item = order.items.id(itemId);
        if (!item) {
            return res.json({ success: false, message: "Item not found." });
        }
        const product = await Product.findById(item.productId);
        if (!product) {
            return res.json({ success: false, message: "Product not found." });
        }
        const variant = product.variants.find(v => v._id.toString() === item.variantId);
        if (!variant) {
            return res.json({ success: false, message: "Variant not found." });
        }
        variant.quantity += item.quantity;
        await product.save();
        item.status = "Return requested";
        item.returnReason = reason;
        const allRequested = order.items.every(i => i.status === "Return requested");
        if (allRequested) {
            order.orderStatus = "Return requested";
            order.returnReason = reason;
        }
        await order.save();
        return res.json({ success: true, message: "Return request submitted!" });
    } catch (error) {
        console.error(error);
        return res.redirect('/pageNotFound');
    }
}



export const returnOrderService = async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        if (!orderId || !reason) {
            return res.json({ success: false, message: "Missing required fields." });
        }
        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.json({ success: false, message: "Order not found." });
        }
        for (let item of order.items) {
            const product = await Product.findById(item.productId);
            if (!product) continue;
            const variant = product.variants.find(v => v._id.toString() === item.variantId);
            if (!variant) continue;
            variant.quantity += item.quantity;
            await product.save();
            item.status = "Return requested";
            item.returnReason = reason;
        }
        order.orderStatus = "Return requested";
        order.returnReason = reason;
        await order.save();
        return res.json({ success: true, message: "Entire order return-requested." });
    } catch (error) {
        console.error(error);
        return res.redirect('/pageNotFound');
    }
}


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