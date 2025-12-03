//importing necessary modules and functions
import express from "express";
import userController from "../controller/user/userController.js";
import passport from "../config/passport.js";
import auth from "../middleware/auth.js";
import nocache from "nocache";

export const router = express.Router();


router.get('/', userController.loadHomepage);
router.get('/pageNotFound', userController.loadErrorPage);
router.get('/signin', nocache(), userController.loadSignin);
router.get('/signup', nocache(), userController.loadSignup);
router.post('/signup', userController.signup);
router.post('/verifyEmailOTP', nocache(), userController.verifyEmailOtp);
router.post('/resendOTP', userController.resendOTP);


//routes for google authentication
router.get('/auth/google', nocache(), passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', nocache(), (req, res, next) => {
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
router.post('/login', nocache(), userController.login);
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

router.get('/profile', auth.userAuth, userController.loadProfilePage);
router.get('/editProfile', auth.userAuth, userController.loadEditProfile);
router.put('/editProfile', userController.updateProfile);

router.get('/editPassword', auth.userAuth, userController.loadEditPassword)
router.put('/editPassword', auth.userAuth, userController.editPassword);

router.get('/addresses', auth.userAuth, userController.loadAdresses);

router.get('/address', auth.userAuth, userController.loadAddAdresses)
router.post('/address', auth.userAuth, userController.addAddress)

router.get('/editAddress/:address', auth.userAuth, userController.loadEditAddress);
router.put('/editAddress/:address', auth.userAuth, userController.editAddress);
router.delete('/deleteAddress/:address', auth.userAuth, userController.deleteAddress);
router.post('/cart/add', userController.addToCart);
export default router; 