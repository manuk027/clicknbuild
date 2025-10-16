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

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => { res.redirect('/') })

router.get('/debug-session', (req, res) => {
    console.log("req.session:", req.session);
    console.log("req.user:", req.user);
    console.log("isAuthenticated():", req.isAuthenticated());
    res.json({
        session: req.session,
        user: req.user,
        isAuthenticated: req.isAuthenticated()
    });
});


router.get('/login', userController.loadLogin);
router.post('/login', userController.login);


router.get('/logout', userController.logout);

export default router; 