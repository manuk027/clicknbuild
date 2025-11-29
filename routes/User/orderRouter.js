import express from 'express';
import { loadSummary } from '../../controller/user/orderController.js'
import auth from '../../middleware/auth.js'
import nocache from 'nocache';

const orderRouter = express.Router();

orderRouter.get('/summary/:orderId', nocache(), auth.userAuth, loadSummary);

export default orderRouter;   