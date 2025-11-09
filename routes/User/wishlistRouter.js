import express from 'express';
import { loadWishlist, addToWishlist, emptyWishlist } from '../../controller/user/wishlistController.js';
import auth from '../../middleware/auth.js'


const wishlistRouter = express.Router();

wishlistRouter.get('/', auth.userAuth, loadWishlist);
wishlistRouter.post('/add', auth.userAuth,  addToWishlist);
wishlistRouter.delete('/empty', auth.userAuth, emptyWishlist);

export default wishlistRouter;