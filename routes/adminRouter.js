//importing necessary modules and functions
import express from 'express';
import adminController from "../controller/admin/adminController.js";
import customerController from "../controller/admin/customerController.js";
import categoryController from '../controller/admin/categoryController.js';
import productController from '../controller/admin/productController.js';
import brandController from '../controller/admin/brandController.js';
import auth from '../middleware/auth.js'
import multer from 'multer';
import storage from '../helpers/multer.js';
import uploads from '../helpers/multer.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

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
router.get('/category/editCategory/', auth.adminAuth, categoryController.loadEditCategory);
router.post('/category/editCategory/', auth.adminAuth, categoryController.editCategory);


//brand management
router.get('/brands', auth.adminAuth, brandController.loadBrand);
router.get('/brands/addBrand', auth.adminAuth, brandController.loadAddBrand)
router.post('/brands/addBrand', auth.adminAuth, uploads.single("brandImage"), brandController.addBrand);
router.get('/brands/unListBrand', auth.adminAuth, brandController.unListBrand);
router.get('/brands/listBrand', auth.adminAuth, brandController.listBrand);
router.get('/brands/editBrand/', auth.adminAuth, brandController.loadEditBrand);
router.post('/brands/editBrand/', auth.adminAuth, uploads.single('brandImage'), brandController.editBrand);


// product management
router.get('/products', auth.adminAuth, productController.loadProduct);
router.get('/products/addProducts', auth.adminAuth, productController.loadAddProduct);
router.post('/products/addProducts', auth.adminAuth, productController.addProduct);
router.get('/products/unListProduct', auth.adminAuth, productController.unListProduct);
router.get('/products/listProduct', auth.adminAuth, productController.listProduct);
router.get('/ptoducts/viewVariants', auth.adminAuth, productController.viewVariants)
router.get('/products/editProduct/', auth.adminAuth, productController.loadEditProduct);
router.put("/products/editProduct/:id", upload.array("images", 4), productController.editProduct);

export default router; 