import User from '../../models/userSchema.js';
import Category from '../../models/categorySchema.js';
import Order from '../../models/ordersSchema.js';



export const loadSummaryService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.redirect('/pageNotFound');
        }
        const user = await User.findById(userId);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        return res.render('summary', { user, peripheral, component, order });
    } catch (error) {
        console.error('Error loading the order summary : ', error);
        return res.redirect('/pageNotFound');
    }
}