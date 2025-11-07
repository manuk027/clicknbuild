//importing necessary modules and functions
import express from "express";
import { loadCart, emptyCart } from "../../controller/user/cartController.js";
import auth from "../../middleware/auth.js"

const cartRouter = express.Router();


cartRouter.get('/', auth.userAuth, loadCart);
cartRouter.delete('/empty', auth.userAuth, emptyCart);
// cartRouter.post('/cart/add', userController.addToCart);
// cartRouter.get('/emptyCart', userController.emptyCart);

export default cartRouter;   