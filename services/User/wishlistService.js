import User from "../../models/userSchema.js"
import Category from "../../models/categorySchema.js";
import Wishlist from '../../models/wishlistSchema.js'



export const loadWishlistService = async (req, res) => {
    const userId = req.user?._id || req.session.user;
    try {
        const user = await User.findById(userId);
        if (!userId) {
            return res.redirect('/login');
        }
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        const wishlist = await Wishlist.findOne({ userId }).populate({ path: "items.productId", populate: { path: "brand", select: "name", }, });
        if (!wishlist) {
            return res.render('wishlist', { user, peripheral, component, wishlist:{items:[]} });
        }
        return res.render('wishlist', { user, peripheral, component, wishlist });
    } catch (error) {
        console.error("Error loading eh wishlist:", error);
    }
}



export const addToWishlistService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const { productId, variantId } = req.body;
        if (!productId || !variantId) {
            return res.json({ success: false, message: "Product not found.", });
        }
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({
                userId,
                items: [{ productId, variantId, addedAt: Date.now() }],
            });
            await wishlist.save();
            return res.json({ success: true, message: "Product added to wishlist", added: true, });
        }
        const itemIndex = wishlist.items.findIndex(
            (item) => item.variantId.toString() === variantId.toString()
        );
        if (itemIndex !== -1) {
            wishlist.items.splice(itemIndex, 1);
            await wishlist.save();
            return res.json({ success: true, message: "Product removed from wishlist", added: false, });
        } else {
            wishlist.items.push({ productId, variantId, addedAt: Date.now() });
            await wishlist.save();
            return res.json({ success: true, message: "Product added to wishlist", added: true, });
        }
    } catch (error) {
        console.error("Error adding/removing product from wishlist:", error);
        return res.redirect('/pageNotFound');
    }
};



export const emptyWishlistService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const user = await User.findById(userId);
        const clear = await Wishlist.deleteOne({ userId: userId });
        if (clear.acknowledged) {
            return res.json({ success: true, message: "Wishlist cleared!" });
        } else {
            return res.json({ success: true, message: "Something went wrong!" });
        }
    } catch (error) {
        console.error("Error emptying the cart:", error);
        return res.redirect('/pageNotFound');
    }
};