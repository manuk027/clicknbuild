import { loadCheckoutService, addAddressService, loadSummaryService } from '../../services/User/checkoutService.js';

export const loadCheckout = async (req, res) => {
    await loadCheckoutService(req, res);
}


export const addAddress = async (req, res) => {
    await addAddressService(req, res);
}

export const loadSummary = async (req, res) => {
    await loadSummaryService(req, res);
}