import {loadWishlistService} from '../../services/User/wishlistService.js'

export const loadWishlist = async (req, res) => {
    console.log("hello");
    await loadWishlistService(req, res);
}