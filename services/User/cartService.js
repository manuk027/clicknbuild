import User from '../../models/userSchema.js';
import Cart from '../../models/cartSchema.js';
import Category from '../../models/categorySchema.js';
import mongoose, { model } from "mongoose";
import Product from '../../models/productSchema.js'
const { ObjectId } = mongoose.Types;
import { getVariantNameById } from '../../helpers/getVariant.js';
import { applyFinalOfferToVariant } from '../../helpers/variantFinalOffer.js';




export async function loadCartService(userId) {
    const user = await User.findById(userId);
    const peripheral = await Category.find({ isPeripheral: true, isListed: true });
    const component = await Category.find({ isComponent: true, isListed: true });
    const cart = await Cart.findOne({ userId }).populate({ path: "items.productId", populate: [{ path: "brand", model: "Brand", select: "name" }, { path: "category", model: "Category", select: "name maxOffer isListed" }] }).lean();
    if (!cart) return { user, peripheral, component, items: [], total: 0 };
    for (let item of cart.items) {
        const product = item.productId;
        const category = product.category;
        const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
        if (!variant) continue;
        const finalOffer = applyFinalOfferToVariant(variant, category);
        item.finalOffer = finalOffer;
        item.unitPrice = finalOffer;
        item.totalPrice = finalOffer * item.quantity;
        item.variantName = await getVariantNameById(item.variantId);
    }
    const cumulativeTotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    return { user, peripheral, component, items: cart.items, total: cumulativeTotal };
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
    const userId = req.user?._id || req.session?.user;

    try {
        const { action } = req.body;
        const { variantId } = req.params;
        if (!["inc", "dec"].includes(action)) return res.status(400).json({ success: false, message: "Invalid action." });
        const cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({ success: false, message: "Cart not found." });
        const item = cart.items.find(i => i.variantId.toString() === variantId);
        if (!item) return res.status(404).json({ success: false, message: "Item not found." });
        const product = await Product.findOne({ _id: item.productId, "variants._id": variantId }, { "variants.$": 1, category: 1 }).populate("category");
        if (!product || !product.variants?.length) {
            if (action === "dec") {
                if (item.quantity === 1) {
                    cart.items = cart.items.filter(i => i.variantId.toString() !== variantId);
                } else {
                    item.quantity--;
                    item.subTotal = item.unitPrice * item.quantity;
                }
                cart.totalAmount = cart.items.reduce((s, i) => s + i.subTotal, 0);
                await cart.save();
                return res.json({ success: true, quantity: item.quantity, removed: item.quantity === 0, total: cart.totalAmount });
            }
            return res.status(400).json({ success: false, message: "This product variant is no longer available." });
        }
        const variant = product.variants[0];
        const maxAllowed = Math.min(variant.quantity, 5);
        if (action === "inc") {
            if (item.quantity >= maxAllowed) return res.status(400).json({ success: false, message: `You can only add up to ${maxAllowed} units.` });
            item.quantity++;
        }
        if (action === "dec") {
            if (item.quantity === 1) {
                cart.items = cart.items.filter(i => i.variantId.toString() !== variantId);
            } else {
                item.quantity--;
            }
        }
        const finalUnitPrice = applyFinalOfferToVariant(variant, product.category);
        item.unitPrice = finalUnitPrice;
        item.subTotal = finalUnitPrice * item.quantity;
        cart.totalAmount = cart.items.reduce((s, i) => s + i.subTotal, 0);
        await cart.save();
        return res.json({ success: true, quantity: item.quantity, subTotal: item.subTotal, total: cart.totalAmount });
    } catch (error) {
        console.error("Error updating count:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};