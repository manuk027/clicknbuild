import User from "../../models/userSchema.js";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import emailOtp from "../../models/otp.js";
dotenv.config();

const loadHomepage = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;

        if (!userId) {
            return res.render("home", { user: null });
        }

        const userData = await User.findById(userId);

        if (!userData) {
            req.session.destroy(() => {
                res.clearCookie("connect.sid");
                return res.render("home", { user: null });
            });
        } else if (userData.isBlocked) {
            req.session.destroy(() => {
                res.clearCookie("connect.sid");
                return res.render("home", { user: null });
            });
        } else {
            return res.render("home", { user: userData });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
};



const loadErrorPage = async (req, res) => {
    try {
        return res.render("errorPage");
    } catch (err) {
        res.redirect("/pageNotFound");
    }
};

const loadSignup = async (req, res) => {
    try {
        return res.render("signup", { message: null });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
};

const loadSignin = async (req, res) => {
    try {
        return res.render("signin");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
};

async function generateOtp(email) {
    await emailOtp.deleteMany({ email });
    let otp = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationOTP = new emailOtp({
        otp: otp,
        email: email,
    })
    await verificationOTP.save()
    return otp;
}

async function sendEmail(email, otp, userName) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secre: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });
        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify you account",
            text: `Your OTP is ${otp}`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 40px 0; text-align: center;">
                    <div style="background-color: #ffffff; width: 90%; max-width: 500px; margin: auto; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
    
                        <!-- Header -->
                        <div style="background-color: #1e293b; padding: 20px;">
                            <img src="cid:logo" alt="ClickNBuild Logo" style="width: 100px; height: auto;">
                    </div>

                    <!-- Content -->
                    <div style="padding: 30px; text-align: center;">
                    <h2 style="color: #1e293b; margin-bottom: 10px;">Email Verification</h2>
                    <p style="color: #475569; font-size: 15px;">Dear ${userName},</p>
                    <p style="color: #475569; font-size: 15px;">
                        Thank you for registering with <strong>clickNbuild</strong>.<br>
                        Please use the OTP below to verify your account.
                    </p>

                    <!-- OTP Box -->
                    <div style="display: inline-block; background-color: #e2e8f0; color: #000; padding: 12px 25px; border-radius: 8px; font-size: 22px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
                    ${otp}
                    </div>

                    <p style="color: #475569; font-size: 14px;">This OTP is valid for <strong>2 minutes</strong>.</p>
                    <p style="color: #94a3b8; font-size: 13px;">If you didn’t request this, please ignore this email.</p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8fafc; color: #64748b; text-align: center; padding: 15px; font-size: 13px;"> 
                    &copy; 2025 clickNbuild. All rights reserved.
                </div>

            </div>
        </div>`,
            attachments: [
                {
                    filename: "logo.png",
                    path: "public/images/logo.png",
                    cid: "logo",
                },
            ],
        });
        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error seending email : ", error);
    }
}

const signup = async (req, res) => {
    try {
        const { fullName, email, password, confirmPassword } = req.body;
        if (password !== confirmPassword) {
            return res.render("signup", { message: "Password do not match." });
        }
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("signup", {
                message: "User with the same email already exist.",
            });
        }
        const otp = await generateOtp(email);
        const emailSent = await sendEmail(email, otp, fullName);
        if (!emailSent) {
            return res.json("email-error");
        }
        req.session.userOtp = otp;
        req.session.userData = { fullName, email, password };
        console.log("OTP", otp);
        res.render("emailOTPVerification", { email: email });
    } catch (err) {
        console.error("Signup Error", err);
        res.redirect("/pageNotFound");
    }
};


const verifyEmailOtp = async (req, res) => {
    try {
        const { otp, email } = req.body;
        let otpDoc = await emailOtp.findOne({ email: email });
        if (!otpDoc) {
            return res.status(400).json({ success: false, message: "OTP expired." });
        }
        if (String(otp) === String(otpDoc.otp)) {
            const user = req.session.userData;
            const saveUserData = new User({
                fullName: user.fullName,
                email: user.email,
                password: user.password,
            });
            await saveUserData.save();
            req.session.user = saveUserData._id;
            await emailOtp.deleteMany({ email });
            return res.json({ success: true, redirectUrl: "/" });
        } else {
            return res.status(400).json({ success: false, message: "Invalid OTP." });
        }
    } catch (error) {
        console.error("Error verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occured" });
    }
};

const resendOTP = async (req, res) => {
    try {
        const user = req.session.userData;
        if (!user || !user.email) {
            return res.status(400).json({ success: false, message: "User session not found." });
        }

        const { fullName, email } = user;

        // delete any old OTP for the user
        await emailOtp.deleteMany({ email });

        // generate a new OTP
        const otp = await generateOtp(email);

        // send email
        const emailSent = await sendEmail(email, otp, fullName);

        if (emailSent) {
            console.log("Resent OTP:", otp);
            return res.status(200).json({
                success: true,
                message: "OTP resent successfully.",
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Failed to resend OTP.",
            });
        }
    } catch (error) {
        console.error("Error resending OTP:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};


const loadLogin = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render("login", { message: null });
        } else {
            res.redirect("/");
        }
    } catch (error) {
        res.redirect("pageNotFound");
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ isAdmin: false, email: email, });
        if (findUser.isBlocked) {
            return res.render("login", {
                message: "User has been blocked by the admin",
            });
        }
        if (!findUser) {
            res.render("login", { message: "User does not exist" });
        }
        if (!password === findUser.password) {
            return res.render("login", { message: "Incorrect Password" });
        }
        req.session.user = findUser._id;

        res.redirect("/");
    } catch (error) {
        console.error("login error", error)
        res.render("login", { message: "Login failed, please try again" })
    }
};

const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log("Sesssion destroy error", err);
                return res.redirect('/pageNotFound');
            }
            return res.redirect("/");
        });
    } catch (error) {
        console.log("logout error", error);
        res.redirect('/pageNotFound');
    }
};


//exporting all the functions
export default {
    loadHomepage,
    loadErrorPage,
    loadSignup,
    loadSignin,
    signup,
    verifyEmailOtp,
    resendOTP,
    loadLogin,
    login,
    logout,
};