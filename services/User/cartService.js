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
    const userId = req.user?._id || req.session.user;

    try {
        const { action } = req.body;
        const { variantId } = req.params;

        if (!userId)
            return res.status(401).json({ success: false, message: "User not logged in." });

        if (!variantId || !["inc", "dec"].includes(action))
            return res.status(400).json({ success: false, message: "Invalid request." });

        const cart = await Cart.findOne({ userId });
        if (!cart)
            return res.status(404).json({ success: false, message: "Cart not found." });

        const item = cart.items.find(i => i.variantId.toString() === variantId);
        if (!item)
            return res.status(404).json({ success: false, message: "Item not found." });

        const product = await Product.findById(item.productId)
            .populate("category");

        const variant = product.variants.id(variantId);
       // If variant does NOT exist in product, but exists in cart → allow only decrease
if (!variant) {

    // If user is decreasing quantity → allow it
    if (action === "dec") {

        if (item.quantity === 1) {
            // remove item if quantity becomes 0
            cart.items = cart.items.filter(i => i.variantId.toString() !== variantId);
            await cart.save();

            return res.json({
                success: true,
                removed: true,
            });
        }

        item.quantity--;

        // Recalculate subtotal using LAST KNOWN PRICE in cart
        item.subTotal = item.unitPrice * item.quantity;

        cart.totalAmount = cart.items.reduce((s, i) => s + i.subTotal, 0);
        await cart.save();

        return res.json({
            success: true,
            quantity: item.quantity,
            subTotal: item.subTotal,
            total: cart.totalAmount,
        });
    }

    // If user is increasing → block it
    return res.status(400).json({
        success: false,
        message: "The product stock is not available.",
    });
}

        // -------------------------------
        // QUANTITY VALIDATIONS
        // -------------------------------
        if (action === "inc") {
            if (item.quantity >= variant.quantity) {
                return res.status(400).json({
                    success: false,
                    message: "No more stock available.",
                });
            }

            if (item.quantity >= item.max) {
                return res.status(400).json({
                    success: false,
                    message: `You can only add up to ${item.max}`,
                });
            }

            item.quantity++;
        }

        if (action === "dec") {
            if (item.quantity === 1) {
                cart.items = cart.items.filter(
                    i => i.variantId.toString() !== variantId
                );
                await cart.save();

                return res.json({
                    success: true,
                    removed: true,
                });
            }

            item.quantity--;
        }

        // -------------------------------
        // APPLY FINAL PRICE (correct logic)
        // -------------------------------
        const finalUnitPrice = applyFinalOfferToVariant(variant, product.category);

        item.unitPrice = finalUnitPrice;
        item.subTotal = finalUnitPrice * item.quantity;

        // -------------------------------
        // UPDATE CART TOTAL
        // -------------------------------
        cart.totalAmount = cart.items.reduce((sum, i) => sum + i.subTotal, 0);
        await cart.save();
        return res.json({
            success: true,
            quantity: item.quantity,
            subTotal: item.subTotal,
            total: cart.totalAmount,
        });

    } catch (error) {
        console.error("Error updating count:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};


