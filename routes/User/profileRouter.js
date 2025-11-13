import express from 'express';
import { loadOrders, cancelOrder, cancelProduct } from '../../controller/user/profileController.js'
import auth from '../../middleware/auth.js'

const profileRouter = express.Router();


profileRouter.get('/orders', auth.userAuth, loadOrders);
profileRouter.put('/cancel-order', auth.userAuth, cancelOrder);
profileRouter.put('/cancel-product', auth.userAuth, cancelProduct);

export default profileRouter;   