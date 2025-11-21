import { loadWalletService, createOrderService, verifyPaymentService } from '../../services/User/walletService.js';

export const loadWallet = async (req, res) => {
    await loadWalletService(req, res);
};

export const createOrder = async (req, res) => {
    await createOrderService(req, res);
}

export const verifyPayment = async (req, res) => {
    await verifyPaymentService(req, res);
}