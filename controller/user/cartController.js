import { loadCartService, emptyCartService, removeItemService, updateCountService } from '../../services/User/cartService.js'


export const loadCart = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const result = await loadCartService(userId);
        return res.render("cart", { peripheral: result.peripheral, component: result.component, user: result.user, cart: result.items, total: result.total });
    } catch (error) {
        console.error("Error loading cart:", error);
        next();
    }
};


export const emptyCart = async (req, res) => {
    await emptyCartService(req, res);
}

export const removeItem = async (req, res) => {
    await removeItemService(req, res);
}

export const updateCount = async (req, res) => {
    await updateCountService(req, res);
}