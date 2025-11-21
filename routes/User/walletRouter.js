import express from "express";
import auth from '../../middleware/auth.js';
import { loadWallet, createOrder, verifyPayment } from '../../controller/user/walletController.js';

const walletRouter = express.Router();

walletRouter.get('/', auth.userAuth, loadWallet);

walletRouter.post('/create-order', auth.userAuth, createOrder);

walletRouter.post('/verify-payment', auth.userAuth, verifyPayment);

export default walletRouter;