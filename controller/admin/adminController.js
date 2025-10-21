//importing necessary modules and functions
import User from "../../models/userSchema.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";


//function to load the error page
const loadErrorPage = async (req, res) => {
    res.render('adminErrorPage');
};

/*
User login

 */

const loadLogin = async (req, res) => {
    if (req.session.admin) {
        return res.redirect('/admin/');
    }
    res.render('adminLogin', { message: null });
}


//function to login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email: email, isAdmin: true });
        if (!admin) {
            return res.render('adminLogin', { message: "Admin not found" });
        }
        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (!passwordMatch) {
            return res.render('adminLogin', { message: "Invalid credentials" });
        }
        req.session.admin = admin._id;
        return res.redirect('/admin');
    } catch (error) {
        console.error("user login", error);
        return res.redirect('/pageNotFound');
    }
}


//function to load dashboard
const loadDashboard = async (req, res) => {
    try {
        if (req.session.admin) {
            res.render('dashboard');
        }
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}


//function to logout user
const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.error("Error destroying session", err);
                return res.redirect("/pageNotFound");
            }
            res.redirect('/admin/login');
        })
    } catch (error) {
        console.error('unexpected error during logout', error);
        res.redirect('/pageNotFound');
    }
}


//export functions
export default { loadLogin, login, loadDashboard, loadErrorPage, logout };