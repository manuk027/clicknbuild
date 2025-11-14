import { loadOrdersService, cancelOrderService, cancelProductService, returnItemService, returnOrderService } from '../../services/User/ordersService.js';



export const loadOrders = async (req, res) => {
    await loadOrdersService(req, res);
}


export const cancelOrder = async (req, res) => {
    await cancelOrderService(req, res);
}

export const cancelProduct = async (req, res) => {
    await cancelProductService(req, res)
}

export const returnItem = async (req, res) => {
    await returnItemService(req, res);
}

export const returnOrder = async (req, res) => {
    await returnOrderService(req, res);
}