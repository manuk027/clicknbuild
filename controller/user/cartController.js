import { loadCartService, emptyCartService, removeItemService, updateCountService } from '../../services/User/cartService.js'



export const loadCart = async (req, res) => {
    await loadCartService(req, res);
}

export const emptyCart = async (req, res) => {
    await emptyCartService(req, res);
}

export const removeItem = async (req, res) => {
    await removeItemService(req, res);
}

export const updateCount = async (req, res) => {
    await updateCountService(req, res);
}