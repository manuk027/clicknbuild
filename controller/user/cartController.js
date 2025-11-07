import {loadCartService, emptyCartService} from '../../services/User/cartService.js'



export const loadCart = async (req, res) => {
    await loadCartService(req, res);
}

export const emptyCart = async(req, res)=>{
    await emptyCartService(req, res);
}