import User from '../../models/userSchema.js';
import Category from '../../models/categorySchema.js';

export const loadWalletService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const user = await User.findOne({ _id: userId });
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        return res.render('wallet', { peripheral, component, user });
    } catch (error) {
        console.error("Error loading Refer and earn page : ", error);
        return res.redirect('/pageNotFound');
    }
}