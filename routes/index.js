import express from 'express';



const router = express.Router();



import userRouter from './userRouter.js';
import couponRouter from './admin/couponRouter.js';
import adminRouter from './adminRouter.js';
import cartRouter from './User/cartRouter.js';
import wishlistRouter from './User/wishlistRouter.js';
import checkoutRouter from './User/chekoutRouter.js';
import orderRouter from './User/orderRouter.js';
import walletRouter from './User/walletRouter.js';
import profileRouter from './User/profileRouter.js';
import invoiceRouter from './User/invoiceRouter.js';



router.use("/", userRouter);
router.use("/admin", couponRouter);
router.use("/admin", adminRouter);
router.use("/cart", cartRouter);
router.use("/wishlist", wishlistRouter);
router.use("/checkout", checkoutRouter);
router.use("/order", orderRouter);
router.use('/wallet', walletRouter);
router.use("/", profileRouter);
router.use("/", invoiceRouter);



export default router;