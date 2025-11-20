import Brand from '../../models/brandSchema.js';
import brandSortOption from "../../helpers/brandSort.js"
import Product from '../../models/productSchema.js';
import Category from '../../models/categorySchema.js';
import Order from '../../models/ordersSchema.js';

const loadOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const sort = req.query.sort || "newest";
        const statusFilter = req.query.status || null;
        const searchTerm = req.query.search ? req.query.search.trim().toLowerCase() : "";

        const sortOption = {
            newest: { createdAt: -1 },
            oldest: { createdAt: 1 }
        }[sort] || { createdAt: -1 };


        const orders = await Order.find().sort(sortOption);
        console.log(orders);

        let rows = [];

        orders.forEach(order => {
            order.items.forEach(item => {
                rows.push({
                    orderId: order.orderId,
                    coverImage: item.coverImage,
                    itemId: item._id,
                    name: item.name,
                    sku: item.sku,
                    orderDate: order.orderDate,
                    address: order.address,
                    subtotal: item.subTotal,
                    quantity: item.quantity,
                    method: order.paymentMethod,
                    status: item.status,
                    transaction: order.transaction,
                    totalAmount: order.totalAmount,
                    deliveryFee: order.deliveryFee,
                    orderStatus: order.orderStatus,
                    paymentMethod: order.paymentMethod,
                    appliedOffer: order.appliedOffer,
                    returnReason: item.returnReason,
                });
            });
        });

        // console.log(rows);

        if (searchTerm) {
            rows = rows.filter(row =>
                (row.orderId && row.orderId.toLowerCase().includes(searchTerm)) ||
                (row.name && row.name.toLowerCase().includes(searchTerm)) ||
                (row.sku && row.sku.toLowerCase().includes(searchTerm))
            );
        }


        if (statusFilter && statusFilter !== "All") {
            rows = rows.filter(row => row.status.toLowerCase() === statusFilter.toLowerCase());
        }


        const totalItems = rows.length;
        const totalPages = Math.ceil(totalItems / limit);
        const paginatedRows = rows.slice(skip, skip + limit);

        return res.render("ordersAccept", {
            product: paginatedRows,
            current: page,
            pages: totalPages,
            totalProducts: totalItems,
            limit,
            sort,
            search: searchTerm,
            statusFilter
        });

    } catch (error) {
        console.error("Error loading orders:", error);
        return res.redirect("/admin/pageNotFound");
    }
};


const changeStatus = async (req, res) => {
    try {
        const { orderId, sku, status } = req.body;
        if (!orderId || !sku || !status) {
            return res.json({ success: false, message: "Missing required fields." });
        }
        const order = await Order.findOneAndUpdate(
            { orderId, "items.sku": sku },
            { $set: { "items.$.status": status } },
            { new: true }
        );
        if (!order) {
            return res.json({ success: false, message: "Order or item not found." });
        }
        const statuses = order.items.map(item => item.status);
        const uniqueStatuses = [...new Set(statuses)];
        if (uniqueStatuses.length === 1) {
            order.orderStatus = uniqueStatuses[0];
            await order.save();
        }
        return res.json({
            success: true,
            message: "Order item status updated successfully!"
        });
    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: "Internal server error." });
    }
};

const loadOrderDetails = async (req, res) => {
    try {
        console.log(req.parms.id);
    } catch (error) {

    }
}




export default { loadOrders, changeStatus, loadOrderDetails };




// {
//     _id: new ObjectId('691e0277febd7449d6d64ffd'),
//     userId: new ObjectId('691a140741cda9393f9fd273'),
//     items: [ [Object] ],
//     deliveryDate: 2025-11-26T00:00:00.000Z,
//     orderDate: 2025-11-19T17:46:31.844Z,
//     createdAt: 2025-11-19T17:46:31.845Z,
//     updatedAt: 2025-11-19T17:48:27.151Z,
//     __v: 0,
//     returnReason: 'Got damaged product'
//   }
