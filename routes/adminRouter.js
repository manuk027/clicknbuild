import express from 'express';
import adminController from "../controller/admin/adminController.js";
import auth from '../middleware/auth.js'


const router = express.Router();

router.get('/pageNotFound', adminController.loadErrorPage)
router.get('/login', adminController.loadLogin);
router.post('/login', adminController.login);
router.get('/', auth.adminAuth, adminController.loadDashboard);

export default router; 