import User from '../../models/userSchema.js';
import Cart from '../../models/cartSchema.js';
import Category from '../../models/categorySchema.js';
import mongoose, { model } from "mongoose";
const { ObjectId } = mongoose.Types;
import { getVariantNameById } from '../../helpers/getVariant.js';




export const loadCartService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const user = await User.findById(userId);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true, });
        const cart = await Cart.findOne({ userId })
            .populate({
                path: "items.productId",
                populate: { path: "brand", model: "Brand", select: "name" }
            })
            .lean();
        if (!cart) {
            return res.render('cart', { peripheral, component, user, cart: [] });
        }
        await Promise.all(
            cart.items.map(async (item) => {
                const variantName = await getVariantNameById(item.variantId);
                item.variantName = variantName;
            })
        );
        return res.render('cart', { peripheral, component, user, cart: cart.items });
    } catch (error) {
        console.error("Error loading cart:", error);
        return res.redirect('/pageNotFound');
    }
}



export const addToCartService = async (req, res) => {
    try {

    } catch (error) {
        console.error("Error adding product to the cart:", error);
        return res.json({ status: 500, message: "Error adding product to the cart!" });
    }
}



export const emptyCartService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const user = await User.findById(userId);
        const empty = await Cart.deleteOne({ userId: user._id });
        if (empty.acknowledged) {
            return res.json({ success: true, message: "Cart emptied!" });
        } else {
            return res.json({ success: true, message: "Something went wrong!" });
        }
    } catch (error) {
        console.error("Error emptying the cart:", error);
        return res.redirect('/pageNotFound');
    }
}



export const removeItemService = async (req, res) => {
    const userId = req.user?._id || req.session.user;
    try {
        const { variantId, productId } = req.body;
        const cart = await Cart.findOne({ userId: userId });
        cart.items = cart.items.filter(
            item => item.variantId.toString() !== variantId
        );
        await cart.save();
        return res.json({ success: true, message: "Item removed from the cart." })
    } catch (error) {
        console.error("Error removing the item form the cart: ", error);
    }
}



export const updateCountService = async (req, res) => {
    const userId = req.user?._id || req.session.user;
    try {
        const { action } = req.body;
        const { variantId } = req.params;
        let count = 0;
        const cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({ message: "Cart not found" });
        if (action === "inc") {
            for (const item of cart.items) {
                if (item.variantId.toString() === variantId) {
                    item.quantity++;
                    count = item.quantity;
                    await cart.save();
                    return res.status(200).json({
                        message: "Quantity updated",
                        quantity: count,
                        variantId
                    });
                }
            }
        }
        if (action === "dec") {
            for (const item of cart.items) {
                if (item.variantId.toString() === variantId) {
                    if (item.quantity > 1) {
                        item.quantity--;
                        count = item.quantity;
                        await cart.save();
                        return res.status(200).json({
                            message: "Quantity updated",
                            quantity: count,
                            variantId
                        });
                    } else {
                        cart.items = cart.items.filter(
                            (i) => i.variantId.toString() !== variantId
                        );
                        await cart.save();
                        return res.status(200).json({
                            status: 200,
                            success: true,
                            removed: true,
                            variantId
                        });
                    }
                }
            }
        }
        return res.status(400).json({ message: "Invalid action" });
    } catch (error) {
        console.error("Error updating count of product:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
