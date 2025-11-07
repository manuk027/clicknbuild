import User from "../../models/userSchema.js"
import Category from "../../models/categorySchema.js";

export const loadWishlistService = async (req, res) => {
    try {
        const userId = req.user?._id || req.session.user;
        const user = await User.findById(userId);
        console.log(user);
        if(!userId){
            return res.redirect('/login');
        }
        const peripheral = await Category.find({isPeripheral:true, isListed:true});
        const component = await Category.find({isComponent:true, isListed:true});
        return res.render('wishlist', {user, peripheral, component});
    } catch (error) {
        console.error("Error loading eh wishlist:", error);
    }
}