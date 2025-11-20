import { loadWalletService } from '../../services/User/walletService.js';

export const loadWallet = async (req, res) => {
    await loadWalletService(req, res);
};