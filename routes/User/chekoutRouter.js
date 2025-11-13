import express from 'express';
import { loadCheckout, addAddress, loadSummary } from '../../controller/user/checkoutController.js'
import auth from '../../middleware/auth.js'

const checkoutRouter = express.Router();


checkoutRouter.get('/', auth.userAuth, loadCheckout);

checkoutRouter.post('/addAddress', auth.userAuth, addAddress);

checkoutRouter.post('/place-order', auth.userAuth, loadSummary);

export default checkoutRouter;   