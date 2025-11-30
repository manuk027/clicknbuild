import express from 'express';
import { loadCheckout, addAddress, loadSummary, createOrder, verifyPayment, getTransactionDetails } from '../../controller/user/checkoutController.js'
import auth from '../../middleware/auth.js'

const checkoutRouter = express.Router();


checkoutRouter.get('/', auth.userAuth, loadCheckout);
// checkoutRouter.post('/', auth.userAuth, loadCheckout);

checkoutRouter.post('/addAddress', auth.userAuth, addAddress);

checkoutRouter.post('/place-order', loadSummary);

checkoutRouter.post("/create-order", createOrder);

checkoutRouter.post('/verify-payment', verifyPayment);

checkoutRouter.post('/get-transaction-details', getTransactionDetails);

export default checkoutRouter;   