import { loadCheckoutService, addAddressService, loadSummaryService, createOrderService, verifyPaymentService, getTransactionDetailsService } from '../../services/User/checkoutService.js';

export const loadCheckout = async (req, res, next) => {
    await loadCheckoutService(req, res, next);
}


export const addAddress = async (req, res) => {
    await addAddressService(req, res);
}

export const loadSummary = async (req, res) => {
    await loadSummaryService(req, res);
}

export const createOrder = async (req, res) => {
    await createOrderService(req, res);
}

export const verifyPayment = async (req, res) => {
    await verifyPaymentService(req, res);
}

export const getTransactionDetails = async (req, res) => {
    await getTransactionDetailsService(req, res);
}