import express from "express";
import auth from '../../middleware/auth.js';
import { loadWallet } from '../../controller/user/walletController.js';

const walletRouter = express.Router();

walletRouter.get('/', auth.userAuth, loadWallet);

export default walletRouter;