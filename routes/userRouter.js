//importing necessary modules and functions
import express from "express";
import userController from "../controller/user/userController.js";
import passport from "../config/passport.js";
import auth from "../middleware/auth.js";


export const router = express.Router();


router.get('/', userController.loadHomepage);
router.get('/pageNotFound', userController.loadErrorPage);
router.get('/signin', userController.loadSignin);
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup);
router.post('/verifyEmailOTP', userController.verifyEmailOtp);
router.post('/resendOTP', userController.resendOTP);


//routes for google authentication
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', (req, res, next) => {
    passport.authenticate('google', async (err, user, info) => {
        if (err) {
            console.error("Passport error:", err);
            return res.render('signup', { message: "Something went wrong. Please try again." });
        }
        if (!user) {
            return res.render('login', { message: info?.message || "User is blocked by the admin." });
        }
        req.logIn(user, (err) => {
            if (err) {
                console.error("Login error:", err);
                return res.render('signup', { message: "Login failed. Try again." });
            }
            return res.redirect('/');
        });
    })(req, res, next);
});



router.get('/login', userController.loadLogin);
router.post('/login', userController.login);
router.get('/logout', userController.logout);


router.get('/peripheral/:name', userController.loadPeripheral)
router.get('/component/:name', userController.loadComponent);
router.get('/shop', userController.loadAllProducts);



router.get('/product', userController.loadProductDetails);
router.get('/shop/limitedEditions', userController.loadLimitedEditions);


router.get('/products', userController.loadSearchedProducts);


router.get('/forgotPassword', userController.loadForgotPassword);
router.post('/forgotPassword', userController.sendOtp)
router.post('/emailOTP', userController.verify);
router.get('/newPassword/:email', userController.loadUpdatePassword);
router.patch('/newPassword/:email', userController.updatePassword)

router.get('/profile', userController.loadProfilePage);
router.get('/editProfile', userController.loadEditProfile);
router.put('/editProfile', userController.updateProfile);

router.get('/editPassword', userController.loadEditPassword)
router.put('/editPassword', userController.editPassword);

router.get('/addresses', userController.loadAdresses);

router.get('/address', userController.loadAddAdresses)
router.post('/address', userController.addAddress)

router.get('/editAddress/:address', userController.loadEditAddress);
router.put('/editAddress/:address', userController.editAddress);
router.delete('/deleteAddress/:address', userController.deleteAddress);

// router.get('/wishlist', userController.loadWishlist);
// router.get('/wishlist', userController.addToWishlist);
router.post('/cart/add', userController.addToCart);
router.get('/emptyCart', userController.emptyCart);
export default router; 