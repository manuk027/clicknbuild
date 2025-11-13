import User from "../../models/userSchema.js";
import Category from "../../models/categorySchema.js";
import Cart from "../../models/cartSchema.js";
import Address from "../../models/addressSchema.js"
import Order from '../../models/ordersSchema.js';
import mongoose from "mongoose";
import { generateSKU } from "../../helpers/skugenerator.js";
import Product from '../../models/productSchema.js';



export const loadCheckoutService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;

    try {
        const user = await User.findById(userId);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        let address = await Address.findOne({ userId });
        address = address ? address.address : [];
        const cart = await Cart.findOne({ userId }).populate({ path: "items.productId", model: "Product", populate: { path: "brand", model: "Brand", select: "name" } }).lean();
        if (!cart) {
            return res.render("checkout", { user, peripheral, component, cart: [], address, totalAmount: 0, deliveryCharge: 0, totalprice: 0 });
        }
        const filteredItem = cart.items
            .map(item => {
                const product = item.productId;
                if (!product || !product.variants) return null;
                const variant = product.variants.find(
                    v => v._id.toString() === item.variantId.toString()
                );
                if (!variant || variant.quantity <= 0) return null;
                return {
                    ...item,
                    productId: {
                        ...product,
                        selectedVariant: variant,
                    }
                };
            })
            .filter(Boolean);
        if (filteredItem.length === 0) {
            return res.json({ success: true, message: "The product in the cart is out of stock." });
        }
        const totalprice = filteredItem.reduce(
            (sum, item) => sum + item.productId.selectedVariant.price * item.quantity,
            0
        );
        const totalAmount = filteredItem.reduce(
            (sum, item) => sum + item.subTotal,
            0
        );
        const deliveryCharge = totalAmount >= 50000 ? 0 : 199;
        return res.render("checkout", { user, peripheral, component, cart: filteredItem, address: address || [], totalAmount, deliveryCharge, totalprice, });
    } catch (error) {
        console.error("Error loading the checkout service:", error);
        return res.redirect("/pageNotFound");
    }
};



export const addAddressService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const { fullName, phoneNumber, address, district, pincode, city, state, landmark } = req.body;
        if (!req.body || !userId) {
            return res.json({ success: false, message: "Address was not added." })
        }
        const userAddress = await Address.findOne({ userId });
        let newAddress = {
            fullName,
            phoneNumber,
            address,
            district,
            state,
            city,
            pincode,
            landmark,
        }
        userAddress.address.push(newAddress);
        await userAddress.save();
        return res.json({ success: true, message: "Address was added." })
    } catch (error) {
        console.error("Error adding address at checkout : ", error);
        return res.redirect('/pageNotFound');
    }
}



export const loadSummaryService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const { address, products, paymentMethod, totalAmount, deliveryFee } = req.body;
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const lastOrder = await Order.findOne({ orderId: { $regex: `^ORD${datePart}` } }).sort({ createdAt: -1 }).lean();
        let nextSequence = 1;
        if (lastOrder?.orderId) {
            const lastSeq = parseInt(lastOrder.orderId.split("-")[1], 10);
            nextSequence = lastSeq + 1;
        }
        const orderId = `ORD${datePart}-${String(nextSequence).padStart(4, "0")}`;
        const items = [];
        for (const prod of products) {
            const productDoc = await Product.findById(prod.productId).populate("brand category").lean();
            if (!productDoc) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }
            const brand = productDoc.brand?.name;
            const category = productDoc.category?.name;
            const model = productDoc.model;
            const variantData = productDoc.variants.find((v) => v._id.toString() === prod.variantId.toString());
            if (!variantData) {
                return res.status(400).json({ success: false, message: "Invalid variant selected" });
            }
            if (variantData.quantity < prod.quantity) {
                return res.status(400).json({ success: false, message: `Insufficient stock for ${prod.name}. Available: ${variantData.quantity}`, });
            }
            const variantName = variantData.variant;
            const sku = generateSKU(brand, model, variantName, category);
            items.push({
                productId: new mongoose.Types.ObjectId(prod.productId),
                variantId: prod.variantId,
                name: prod.name,
                sku,
                price: prod.subTotal / prod.quantity,
                salePrice: prod.subTotal / prod.quantity,
                quantity: prod.quantity,
                subTotal: prod.subTotal,
                appliedOffer: "",
                category: category,
                coverImage: prod.image,
                status: "pending",
                refundAmount: 0,
                cancelReason: "none",
                returnReason: "none",
                returnApprove: false,
            });
        }
        const today = new Date();
        const deliveryDate = new Date(today);
        deliveryDate.setDate(today.getDate() + 7);
        const formattedDeliveryDate = deliveryDate.toLocaleDateString("en-CA");
        const newOrder = new Order({
            userId,
            orderId,
            address: {
                fullName: address.fullName,
                phoneNumber: address.phoneNumber,
                address: address.address,
                district: address.district,
                state: address.state,
                city: address.city,
                pincode: address.pincode,
                landmark: address.landmark || " ",
            },
            items,
            deliveryFee,
            totalAmount,
            paymentMethod: paymentMethod === "Cash on Delivery" ? "COD" : "Wallet",
            deliveryDate: formattedDeliveryDate,
        });
        await newOrder.save();
        for (const item of items) {
            const updateResult = await Product.updateOne({ _id: item.productId, "variants._id": item.variantId }, { $inc: { "variants.$.quantity": -item.quantity } }
            );
            if (updateResult.modifiedCount === 0) {
                console.warn(`Failed to update stock for product ${item.productId}`);
            }
        }
        const updatedCart = await Cart.findOneAndDelete({ userId });
        if (req.xhr || req.headers["content-type"]?.includes("application/json")) {
            return res.status(200).json({ success: true, message: "Order placed successfully!", received: newOrder, });
        }
    } catch (error) {
        console.error("Error loading the order Summary:", error);
        return res.redirect("/pageNotFound");
    }
};
