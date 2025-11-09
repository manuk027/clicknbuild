//importing necessary modules and functions
import express from "express";
import { loadCart, emptyCart, removeItem, updateCount } from "../../controller/user/cartController.js";
import auth from "../../middleware/auth.js"

const cartRouter = express.Router();


cartRouter.get('/', auth.userAuth, loadCart);
cartRouter.delete('/empty', auth.userAuth, emptyCart);
cartRouter.delete('/remove', auth.userAuth, removeItem);
cartRouter.patch('/count/:variantId', auth.userAuth, updateCount);
// cartRouter.post('/cart/add', userController.addToCart);
// cartRouter.get('/emptyCart', userController.emptyCart);  

export default cartRouter;   