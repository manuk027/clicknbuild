import express from 'express';
import { loadWishlist } from '../../controller/user/wishlistController.js';

const wishlistRouter = express.Router();

wishlistRouter.get('/', loadWishlist);

export default wishlistRouter;