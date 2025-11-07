import User from '../../models/userSchema.js';
import Product from '../../models/productSchema.js';
import Cart from '../../models/cartSchema.js';
import Category from '../../models/categorySchema.js';
import Brand from '../../models/categorySchema.js';
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