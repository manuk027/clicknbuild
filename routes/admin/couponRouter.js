import express from 'express';
import auth from '../../middleware/auth.js'
import { loadCoupons, unListCoupons, listCoupons, loadAddCoupons, addCoupons } from '../../controller/admin/couponController.js';

const couponRouter = express.Router();


couponRouter.get('/coupons', auth.adminAuth, loadCoupons);
couponRouter.get('/coupons/addCoupons', auth.adminAuth, loadAddCoupons)
couponRouter.post('/coupons/addCoupons', auth.adminAuth, addCoupons);
couponRouter.get('/coupons/unListCoupon', auth.adminAuth, unListCoupons);
couponRouter.get('/coupons/listCoupon', auth.adminAuth, listCoupons);
export default couponRouter; 