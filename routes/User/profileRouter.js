import express from 'express';
import { loadOrders, cancelOrder, cancelProduct, returnItem, returnOrder } from '../../controller/user/profileController.js'
import auth from '../../middleware/auth.js'

const profileRouter = express.Router();


profileRouter.get('/orders', auth.userAuth, loadOrders);
profileRouter.put('/cancel-order', auth.userAuth, cancelOrder);
profileRouter.put('/cancel-product', auth.userAuth, cancelProduct);
profileRouter.post('/orders/returnItem', auth.userAuth, returnItem);
profileRouter.post('/orders/returnOrder', auth.userAuth, returnOrder);

export default profileRouter;   