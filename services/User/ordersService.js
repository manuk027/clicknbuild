import User from '../../models//userSchema.js'
import Category from '../../models/categorySchema.js'
import Order from '../../models/ordersSchema.js'
import Product from '../../models/productSchema.js';



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
        if (order.items.some(item => item.status === "delivered")) {
            return res.json({
                success: false,
                message: "Delivered items cannot be cancelled"
            });
        }
        for (let item of order.items) {
            console.log(item);
            await Product.updateOne(
                { _id: item.productId, "variants._id": item.variantId },
                { $inc: { "variants.$.quantity": item.quantity } }
            );
        }
        order.items = order.items.map(item => ({
            ...item, status: "cancelled",
        }))
        order.orderStatus = "cancelled";
        await order.save();
        return res.json({ success: true, message: "Order Cancelled" });
    } catch (error) {
        console.error('Error caneling the order:', error);
        return res.redirect('/pageNotFound');
    }
}



export const cancelProductService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const { itemId, orderId } = req.body;
        console.log(req.body);
        const order = await Order.findOne({ userId, orderId });
        if (!order) {
            return res.json({ success: false, message: "Order not found!" });
        }
        const item = order.items.id(itemId);
        await Product.updateOne(
            { _id: item.productId, "variants._id": item.variantID },
            { $inc: { "variants.$.quantity": item.quantity } }
        );
        item.status = "cancelled";
        const allCancelled = order.items.every(i => i.status === "cancelled");
        if (allCancelled) {
            order.orderStatus = "cancelled";
        }
        await order.save();
        return res.json({ success: true, message: "Product Cancelled!" });
    } catch (error) {
        console.error('Error canceling the product : ', error);
    }
}