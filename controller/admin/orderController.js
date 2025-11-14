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


        let rows = [];

        orders.forEach(order => {
            order.items.forEach(item => {
                rows.push({
                    orderId: order.orderId,
                    coverImage: item.coverImage,
                    name: item.name,
                    sku: item.sku,
                    orderDate: order.orderDate,
                    address: order.address,
                    subtotal: item.subTotal,
                    quantity: item.quantity,
                    method: order.paymentMethod,
                    status: item.status
                });
            });
        });


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
            { orderId: orderId, "items.sku": sku },
            { $set: { "items.$.status": status } },
            { new: true }
        );
        if (!order) {
            return res.json({ success: false, message: "Order or item not found." });
        }
        const activeStates = ["pending", "processing", "out-for-delivery", "return-requested"];
        const hasActiveItems = order.items.some(item =>
            activeStates.includes(item.status)
        );
        if (!hasActiveItems) {
            const finalStatuses = order.items.map(item => item.status);
            if (finalStatuses.every(s => s === "delivered")) {
                order.orderStatus = "delivered";
            }
            else if (finalStatuses.every(s => s === "cancelled")) {
                order.orderStatus = "cancelled";
            }
            else if (finalStatuses.every(s => s === "returned" || s === "Returned")) {
                order.orderStatus = "Returned"; 
            }
            else if (finalStatuses.every(s => s === "return-requested")) {
                order.orderStatus = "return-requested";
            }
            else {
                order.orderStatus = "delivered";
            }

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




export default { loadOrders, changeStatus };