import { loadWishlistService, addToWishlistService, emptyWishlistService } from '../../services/User/wishlistService.js'

export const loadWishlist = async (req, res) => {
    await loadWishlistService(req, res);
}

export const addToWishlist = async (req, res) => {
    await addToWishlistService(req, res);
}

export const emptyWishlist = async (req, res) => {
    await emptyWishlistService(req, res);
}