//importing necessary modules and functions
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
router.get('/unblockCustomers', auth.adminAuth, customerController.unblockCustomer);


//category management
router.get('/category', auth.adminAuth, categoryController.categoryInfo);
router.get('/category/add', auth.adminAuth, categoryController.loadAddCategory)
router.post('/category/add', auth.adminAuth, categoryController.addCategory);
router.delete('/category/:id', auth.adminAuth, categoryController.deleteCategory);
router.post('/category/addCategoryOffer', auth.adminAuth, categoryController.addCategoryOffer)
router.post('/category/removeCategoryOffer', auth.adminAuth, categoryController.removeCategoryOffer)
router.get('/category/unListCategory', auth.adminAuth, categoryController.unListCategory);
router.get('/category/listCategory', auth.adminAuth, categoryController.listCategory)


export default router; 