import { loadOrdersService, cancelOrderService, cancelProductService } from '../../services/User/ordersService.js';



export const loadOrders = async (req, res) => {
    await loadOrdersService(req, res);
}


export const cancelOrder = async (req, res) => {
    await cancelOrderService(req, res);
}

export const cancelProduct = async (req, res) => {
    await cancelProductService(req, res)
}