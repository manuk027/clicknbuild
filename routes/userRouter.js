import express from "express";
import { loadHomepage, loadErrorPage } from "../controller/user/userController.js";

export const router = express.Router();

router.get('/', loadHomepage);
router.get('/pageNotFound', loadErrorPage);

export default router;