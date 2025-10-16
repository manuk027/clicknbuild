import express from 'express';
import adminController from "../controller/admin/adminController.js";
import customerController from "../controller/admin/customerController.js";
import categoryController from '../controller/admin/categoryController.js';
import auth from '../middleware/auth.js'


const router = express.Router();

router.get('/pageNotFound', adminController.loadErrorPage)
router.get('/login', adminController.loadLogin);
router.post('/login', adminController.login);
router.get('/', auth.adminAuth, adminController.loadDashboard);
router.get('/logout', adminController.logout);

//cutomer Routes
router.get('/customers', auth.adminAuth, customerController.customerInfo);
router.get('/blockCustomers', auth.adminAuth, customerController.blockCustomer);
router.get('/unblockCustomers', auth.adminAuth, customerController.unblockCustomer );

//category management
router.get('/category', auth.adminAuth, categoryController.categoryInfo);
router.post('/category/add', auth.adminAuth, categoryController.addCategory);

export default router; 