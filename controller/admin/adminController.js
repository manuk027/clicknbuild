//importing necessary modules and functions
import User from "../../models/userSchema.js";
import bcrypt from "bcrypt";
import { HttpStatus } from "../../helpers/statusCodes.js";


//function to load the error page
const loadErrorPage = async (req, res) => {
    res.render('errorPage', { statusCode: HttpStatus.NOT_FOUND, message: "Page not found." });
};



const loadLogin = async (req, res) => {
    if (req.session.admin) {
        return res.redirect('/admin');
    }
    res.render('adminLogin', { message: null });
}



//function to login user
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email: email, isAdmin: true });
        if (!admin) return res.render('adminLogin', { message: "Invalid Credentials." });
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.render('adminLogin', { message: "Invalid Credentials." });
        req.session.admin = admin._id;
        return res.redirect('/admin');
    } catch (error) {
        console.error("Error user logging : ", error);
        next(error);
    }
}



//function to load dashboard
const loadDashboard = async (req, res, next) => {
    try {
        if (req.session.admin) {
            return res.render('dashboard');
        }
    } catch (error) {
        console.error("Error loading the dashboard: ", error);
        next(error)
    }
}



//function to logout user
const logout = async (req, res, next) => {
    try {
        req.session.destroy(error => {
            if (error) return next(error);
            res.redirect('/admin/login');
        });
    } catch (error) {
        console.error('Error logging out the user', error);
        next(error);
    }
}



//export functions
export default { loadLogin, login, loadDashboard, loadErrorPage, logout };