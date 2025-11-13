import express from 'express';
import { loadSummary } from '../../controller/user/orderController.js'
import auth from '../../middleware/auth.js'

const orderRouter = express.Router();

orderRouter.get('/summary/:orderId', auth.userAuth, loadSummary);

export default orderRouter;   