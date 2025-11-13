import User from '../../models/userSchema.js';
import Cart from '../../models/cartSchema.js';
import Category from '../../models/categorySchema.js';
import mongoose, { model } from "mongoose";
import Product from '../../models/productSchema.js'
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
        return res.render('cart', { peripheral, component, user, cart: cart.items, total: cart.totalAmount });
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
        cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.subTotal || 0), 0);
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

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not logged in." });
        }

        if (!variantId || !["inc", "dec"].includes(action)) {
            return res.status(400).json({ success: false, message: "Invalid request." });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({ success: false, message: "Cart not found." });

        const item = cart.items.find(i => i.variantId.toString() === variantId);
        if (!item) return res.status(404).json({ success: false, message: "Item not found in cart." });


        const product = await Product.findById(item.productId);
        if (!product) return res.status(404).json({ success: false, message: "Product not found." });

        const variant = product.variants.id(variantId);
        if (!variant)
            return res.status(404).json({ success: false, message: "Variant not found for this product." });

        let count = item.quantity;
        if (action === "inc") {
            if (item.quantity >= variant.quantity) {
                return res.status(400).json({
                    success: false,
                    message: "No more items available.",
                    quantity: item.quantity,
                    variantId,
                });
            }
            if (item.quantity >= item.max) {
                return res.status(400).json({
                    success: false,
                    message: `You can only add up to ${item.max} units of this product.`,
                    quantity: item.quantity,
                    variantId,
                });
            }
            item.quantity++;
            count = item.quantity;
        }
        if (action === "dec") {
            if (item.quantity > 1) {
                item.quantity--;
                count = item.quantity;
            } else {
                cart.items = cart.items.filter(i => i.variantId.toString() !== variantId);
                await cart.save();
                return res.status(200).json({
                    success: true,
                    removed: true,
                    message: "Item removed from cart.",
                    variantId,
                });
            }
        }
        item.subTotal = variant.offer * item.quantity;

        cart.totalAmount = cart.items.reduce((sum, i) => sum + i.subTotal, 0);

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Quantity updated successfully.",
            quantity: count,
            variantId,
            total: cart.totalAmount,
        });
    } catch (error) {
        console.error("Error updating count of product:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while updating cart.",
        });
    }
};
