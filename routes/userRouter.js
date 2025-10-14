import express from "express";
import userController from "../controller/user/userController.js";
import passport from "../config/passport.js";

export const router = express.Router();

router.get('/', userController.loadHomepage);

router.get('/pageNotFound', userController.loadErrorPage);

router.get('/signin', userController.loadSignin);

router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup);

router.post('/verifyEmailOTP', userController.verifyEmailOtp);

router.post('/resendOTP', userController.resendOTP);

router.get('/auth/google/', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
    res.redirect('/')
})

router.get('/login', userController.loadLogin);
router.post('/login', userController.login);


router.get('/logout', userController.logout);

export default router; 