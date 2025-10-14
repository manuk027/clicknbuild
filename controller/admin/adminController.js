import User from "../../models/userSchema.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";


const loadErrorPage = async (req, res) => {
    res.render('errorPage');
};

const loadLogin = async (req, res) => {
    if (req.session.admin) {
        return res.redirect('/admin/');
    }
    res.render('adminLogin', { message: null });
}

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

const loadDashboard = async (req, res) => {
    try {
        if (req.session.admin) {
            res.render('dashboard');
        }
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}

export default { loadLogin, login, loadDashboard, loadErrorPage };