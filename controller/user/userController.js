import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js"
import Category from "../../models/categorySchema.js";
import Brand from "../../models/brandSchema.js";
import CouponUsage from '../../models/couponUsage.js';
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import emailOtp from "../../models/otp.js";
import getSortOption from "../../helpers/productSort.js";
import bcrypt from "bcryptjs";
import Address from "../../models/addressSchema.js";
import mongoose from "mongoose";
import Cart from "../../models/cartSchema.js"
import Wishlist from '../../models/wishlistSchema.js';
import { generateUniqueReferralCode } from '../../helpers/referalCode.js'
import Coupon from '../../models/couponSchema.js';
import { generateCouponCode } from '../../helpers/coupon.js'
import { HttpStatus } from '../../helpers/statusCodes.js';



dotenv.config();



const loadHomepage = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const fetchPeripheral = Category.find({ isPeripheral: true, isListed: true }).lean();
        const fetchComponent = Category.find({ isComponent: true, isListed: true }).lean();
        const fetchBrands = Brand.find().lean();
        const fetchProducts = Product.find({ isListed: true }).populate("brand", "name").lean();
        const [peripheral, component, brand, product] = await Promise.all([fetchPeripheral, fetchComponent, fetchBrands, fetchProducts]);
        let currentUser = null;
        if (userId) {
            const userData = await User.findById(userId).lean();
            if (userData) {
                if (userData.isBlocked) {
                    if (req.session) delete req.session.user;
                } else {
                    currentUser = userData;
                }
            }
        }
        return res.render('home', { user: currentUser, peripheral, component, brand, product, });
    } catch (error) {
        console.error("Error loading homepage: ", error);
        next(error);

    }
};



const loadErrorPage = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const userData = await User.findById(userId);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        return res.render("errorPage");
    } catch (err) {
        res.redirect("/pageNotFound");
    }
};



const loadSignup = async (req, res) => {
    try {
        if (req.user?._id || req.session?.user) {
            return res.redirect('/')
        }
        // const referralCode = req.query.refToken || '';
        return res.render("signup", { message: null, referralCode, });
    } catch (error) {
        console.error("Error loading the signup page");
        next(error);
    }
};



const loadSignin = async (req, res) => {
    try {
        if (req.user?._id || req.session?.user) {
            return res.redirect('/')
        }
        return res.render("signin");
    } catch (error) {
        console.error(err);
        next(error);
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
        const { fullName, email, password, confirmPassword, referralCode } = req.body;
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
        req.session.userData = { fullName, email, password, referralCode };
        res.render("emailOTPVerification", { email: email });
    } catch (err) {
        console.error("Signup Error", err);
        res.redirect("/pageNotFound");
    }
};



const verifyEmailOtp = async (req, res) => {
    try {
        const { otp, email, } = req.body;
        let otpDoc = await emailOtp.findOne({ email: email });
        if (!otpDoc) {
            return res.status(400).json({ success: false, message: "OTP expired." });
        }
        if (String(otp) === String(otpDoc.otp)) {
            const user = req.session.userData;
            let referralCode = user.referralCode;
            let referredUser = null;
            if (referralCode && referralCode.trim() !== "") {
                referredUser = await User.findOne({ referralCode: referralCode.trim() });
            }
            if (referredUser) {
                const coupon = new Coupon({
                    name: `REFERRAL`,
                    code: generateCouponCode(),
                    userId: referredUser._id,
                    discount: 10,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    minimumPurchase: 20000,
                    isListed: true,
                });

                await coupon.save();
                const usage = new CouponUsage({
                    userId: referredUser._id,
                    couponId: coupon._id,
                    used: false,
                })
                await usage.save();
            }
            const saveUserData = new User({
                fullName: user.fullName,
                email: user.email,
                password: user.password,
                referedBy: referredUser ? referredUser._id : null,
            });
            await saveUserData.save();
            const refCode = await generateUniqueReferralCode(saveUserData._id.toString());
            saveUserData.referralCode = refCode;
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
        await emailOtp.deleteMany({ email });
        const otp = await generateOtp(email);
        const emailSent = await sendEmail(email, otp, fullName);

        if (emailSent) {
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
        if (req.user?._id || req.session?.user) {
            return res.redirect('/')
        }
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
        if (!findUser) {
            return res.render("login", { message: "User does not exist" });
        }
        if (findUser.isBlocked) {
            return res.render("login", {
                message: "User has been blocked by the admin",
            });
        }
        if (!findUser.password) {
            return res.render("login", {
                message: "User has Signed-In with google account.",
            });
        }
        let comparePassword = await bcrypt.compare(password, findUser.password);
        if (!comparePassword) {
            return res.render("login", { message: "Incorrect Password" });
        }
        req.session.user = findUser._id;

        return res.redirect("/");
    } catch (error) {
        console.error("login error", error)
        res.render("login", { message: "Login failed, please try again" })
    }
};



const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error("Sesssion destroy error", err);
                return res.redirect('/pageNotFound');
            }
            return res.redirect("/");
        });
    } catch (error) {
        console.error("logout error", error);
        res.redirect('/pageNotFound');
    }
};



const loadPeripheral = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const peripheral = req.params.name;
        const sort = req.query.sort || "default";
        const selectedBrands = req.query.brand;
        const selectedCategories = req.query.category;
        const page = parseInt(req.query.page) || 1;
        const limit = 21;
        const skip = (page - 1) * limit;
        const wishlist = await Wishlist.findOne({ userId });
        const wish = wishlist?.items?.map(item => String(item.variantId.toString())) ?? [];
        const category = await Category.findOne({ name: peripheral });
        if (!category) return res.redirect("/pageNotFound");
        const sortOption = getSortOption(sort);
        const userData = await User.findById(userId);
        let productFilter = { category: category._id, isListed: true };
        if (selectedBrands) {
            const brandNames = Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands];
            const brandIds = await Brand.find({ name: { $in: brandNames } }).distinct("_id");
            productFilter.brand = { $in: brandIds };
        }
        if (selectedCategories) {
            const categoryNames = Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories];
            const categoryIds = await Category.find({ name: { $in: categoryNames } }).distinct("_id");
            productFilter.category = { $in: categoryIds };
        }
        const totalProducts = await Product.countDocuments(productFilter);
        const product = await Product.find(productFilter).populate("brand", "name").populate("category", "name").sort(sortOption).skip(skip).limit(limit);
        const totalPages = Math.ceil(totalProducts / limit);
        const peripherals = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        const fullProducts = await Product.find({ category: category._id, isListed: true }).select("brand category");
        const distinctBrandIds = [...new Set(fullProducts.map(p => p.brand?.toString()))].filter(Boolean);
        const distinctCategoryIds = [...new Set(fullProducts.map(p => p.category?.toString()))].filter(Boolean);
        const brand = await Brand.find({ _id: { $in: distinctBrandIds } });
        const filterBrand = brand.map(b => b.name);
        const categoryList = await Category.find({ _id: { $in: distinctCategoryIds } });
        const filterCategory = categoryList.map(c => c.name);
        if (product.length === 0) {
            return res.render("noProductFound", { product, peripheral: peripherals, component, brand, user: userData, });
        }
        res.render("productPages", {
            product,
            peripheral: peripherals,
            component,
            brand,
            user: userData,
            filterBrand,
            filterCategory,
            selectedBrands: Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands],
            selectedCategories: Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories],
            route: "peripheral",
            name: peripheral,
            wish,
            baseRoute: `/peripheral/${peripheral}`,
            current: page,
            pages: totalPages,
            totalProducts,
            sort,
        });
    } catch (error) {
        console.error("Error loading peripherals:", error);
        return res.redirect("/pageNotFound");
    }
};



const loadComponent = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const componentName = req.params.name;
        const sort = req.query.sort || "default";
        const selectedBrands = req.query.brand;
        const selectedCategories = req.query.category;
        const page = parseInt(req.query.page) || 1;
        const limit = 21;
        const skip = (page - 1) * limit;
        const category = await Category.findOne({ name: componentName });
        if (!category) return res.redirect("/pageNotFound");
        const wishlist = await Wishlist.findOne({ userId });
        const wish = wishlist?.items?.map(item => String(item.variantId.toString())) ?? [];
        const sortOption = getSortOption(sort);
        const filter = { category: category._id, isListed: true };
        if (selectedBrands) {
            const brandNames = Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands];
            const brandIds = await Brand.find({ name: { $in: brandNames } }).distinct("_id");
            filter.brand = { $in: brandIds };
        }
        if (selectedCategories) {
            const categoryNames = Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories];
            const categoryIds = await Category.find({ name: { $in: categoryNames } }).distinct("_id");
            filter.category = { $in: categoryIds };
        }
        const totalProducts = await Product.countDocuments(filter);
        const products = await Product.find(filter).populate("brand", "name").populate("category", "name").sort(sortOption).skip(skip).limit(limit);
        const totalPages = Math.ceil(totalProducts / limit);
        const peripherals = await Category.find({ isPeripheral: true, isListed: true });
        const components = await Category.find({ isComponent: true, isListed: true });
        const fullProducts = await Product.find({ category: category._id, isListed: true }).select("brand category");
        const distinctBrandIds = [...new Set(fullProducts.map(p => p.brand?.toString()))].filter(Boolean);
        const distinctCategoryIds = [...new Set(fullProducts.map(p => p.category?.toString()))].filter(Boolean);
        const brand = await Brand.find({ _id: { $in: distinctBrandIds } });
        const filterBrand = brand.map(b => b.name);
        const categoryList = await Category.find({ _id: { $in: distinctCategoryIds } });
        const filterCategory = categoryList.map(c => c.name);
        const userData = await User.findById(userId);
        if (products.length === 0) {
            return res.render("noProductFound", { product: products, peripheral: peripherals, component: components, brand, user: userData, filterBrand, filterCategory, selectedBrands: [], selectedCategories: [], });
        }
        res.render("productPages", { product: products, peripheral: peripherals, component: components, brand, user: userData, filterBrand, filterCategory, selectedBrands: Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands], selectedCategories: Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories], route: "component", name: componentName, wish, baseRoute: `/component/${componentName}`, current: page, pages: totalPages, totalProducts, sort, });
    } catch (error) {
        console.error("Error loading components:", error);
        return res.redirect("/pageNotFound");
    }
};



const loadAllProducts = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const page = parseInt(req.query.page) || 1;
        const limit = 21;
        const skip = (page - 1) * limit;
        const selectedBrands = req.query.brand;
        const selectedCategories = req.query.category;
        const searchQuery = req.query.search?.trim() || "";
        const sort = req.query.sort || "default";
        const sortOption = getSortOption(sort);
        const wishlist = await Wishlist.findOne({ userId });
        const wish = wishlist?.items?.map(item => String(item.variantId)) ?? [];
        const filter = { isListed: true };
        if (selectedBrands) {
            filter.brand = Array.isArray(selectedBrands) ? { $in: selectedBrands } : selectedBrands;
        }
        if (selectedCategories) {
            filter.category = Array.isArray(selectedCategories) ? { $in: selectedCategories } : selectedCategories;
        }
        if (searchQuery) {
            filter.$or = [{ model: { $regex: searchQuery, $options: "i" } }, { description: { $regex: searchQuery, $options: "i" } },];
        }
        const validBrands = await Brand.find({ isListed: true }).select("_id");
        const validCategories = await Category.find({ isListed: true }).select("_id");
        filter.brand = filter.brand || { $in: validBrands.map(b => b._id) };
        filter.category = filter.category || { $in: validCategories.map(c => c._id) };
        const totalProducts = await Product.countDocuments(filter);
        const allProducts = await Product.find(filter).populate("brand", "name").populate("category", "name").sort(sortOption).skip(skip).limit(limit);
        const totalPages = Math.ceil(totalProducts / limit);
        const userData = await User.findById(userId);
        const peripherals = await Category.find({ isPeripheral: true, isListed: true });
        const components = await Category.find({ isComponent: true, isListed: true });
        const fullProducts = await Product.find(filter).select("brand category");
        const allBrandIds = [...new Set(fullProducts.map(p => p.brand?.toString()))].filter(Boolean);
        const allCategoryIds = [...new Set(fullProducts.map(p => p.category?.toString()))].filter(Boolean);
        const brand = await Brand.find({ _id: { $in: allBrandIds } }).select("name");
        const filterBrand = brand.map(b => b.name);
        const categoryList = await Category.find({ _id: { $in: allCategoryIds } }).select("name");
        const filterCategory = categoryList.map(c => c.name);
        const selectedBrandsArray = selectedBrands ? Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands] : [];
        const selectedCategoriesArray = selectedCategories ? Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories] : [];
        if (allProducts.length === 0) {
            return res.render("noProductFound", { product: [], peripheral: peripherals, component: components, brand, user: userData, filterBrand, filterCategory, selectedBrands: selectedBrandsArray, selectedCategories: selectedCategoriesArray, searchQuery, });
        }
        res.render("productPages", { product: allProducts, peripheral: peripherals, component: components, user: userData, filterBrand, filterCategory, selectedBrands: selectedBrandsArray, selectedCategories: selectedCategoriesArray, wish, current: page, pages: totalPages, totalProducts, searchQuery, baseRoute: "/shop", });
    } catch (error) {
        console.error("Error loading all products:", error);
        return res.redirect("/pageNotFound");
    }
};



const loadProductDetails = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const variant = parseInt(req.query.variant) || 0;
        const userData = await User.findById(userId);
        const peripherals = await Category.find({ isPeripheral: true, isListed: true });
        const components = await Category.find({ isComponent: true, isListed: true });
        const wishlist = await Wishlist.findOne({ userId });
        const wish = wishlist?.items?.map(item => String(item.variantId.toString())) ?? [];
        const prodId = req.query.id;
        const product = await Product.findOne({ _id: prodId, isListed: true }).populate({ path: "category", match: { isListed: true }, select: "name isListed" }).populate({ path: "brand", match: { isListed: true }, select: "name isListed" });
        if (!product || !product.brand || !product.category) {
            return res.redirect("/pageNotFound");
        }
        const recommendedProducts = await Product.find({ category: product.category._id, isListed: true, })
            .populate({ path: "brand", match: { isListed: true }, select: "name" })
            .populate({ path: "category", match: { isListed: true }, select: "name" })
            .limit(4)
            .then(prods => prods.filter(p => p.brand && p.category));
        return res.render("productDetails", { product, peripheral: peripherals, component: components, user: userData, recommendedProducts, index: variant, wish });
    } catch (error) {
        console.error("Error loading the product details page:", error);
        return res.redirect("/pageNotFound");
    }
};



const loadLimitedEditions = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;

        const page = parseInt(req.query.page) || 1;
        const limit = 21;
        const skip = (page - 1) * limit;

        // Extract filters and sort options
        const selectedBrands = req.query.brand;
        const selectedCategories = req.query.category;
        const sort = req.query.sort;
        const sortOption = getSortOption(sort);

        const wishlist = await Wishlist.findOne({ userId });
        const wish = wishlist?.items?.map(item => String(item.variantId)) ?? [];

        // Build filter object
        const filter = { onFlashSale: true, isListed: true };

        if (selectedBrands) {
            filter["brand.name"] = Array.isArray(selectedBrands)
                ? { $in: selectedBrands }
                : selectedBrands;
        }

        if (selectedCategories) {
            filter["category.name"] = Array.isArray(selectedCategories)
                ? { $in: selectedCategories }
                : selectedCategories;
        }

        // Count total products for pagination
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        // Fetch paginated products
        const products = await Product.find(filter)
            .populate("brand", "name")
            .populate("category", "name")
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        // Fetch additional data
        const userData = await User.findById(userId);
        const peripherals = await Category.find({ isPeripheral: true, isListed: true });
        const components = await Category.find({ isComponent: true, isListed: true });

        // Distinct filter lists
        const distinctBrandIds = [...new Set(products.map(p => p.brand?._id))].filter(Boolean);
        const distinctCategoryIds = [...new Set(products.map(p => p.category?._id))].filter(Boolean);

        const brand = await Brand.find({ _id: { $in: distinctBrandIds } });
        const filterBrand = brand.map(b => b.name);

        const categoryList = await Category.find({ _id: { $in: distinctCategoryIds } });
        const filterCategory = categoryList.map(c => c.name);

        // Handle query values consistently
        const selectedBrandsArray = selectedBrands
            ? Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands]
            : [];

        const selectedCategoriesArray = selectedCategories
            ? Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories]
            : [];

        // If no products found
        if (products.length === 0) {
            return res.render("noProductFound", {
                product: products,
                peripheral: peripherals,
                component: components,
                brand,
                user: userData,
                filterBrand,
                filterCategory,
                selectedBrands: selectedBrandsArray,
                selectedCategories: selectedCategoriesArray,
            });
        }

        // Render main page
        return res.render("productPages", {
            product: products,
            peripheral: peripherals,
            component: components,
            brand,
            user: userData,
            filterBrand,
            filterCategory,
            selectedBrands: selectedBrandsArray,
            selectedCategories: selectedCategoriesArray,
            wish,
            baseRoute: "/shop/limitedEditions",
            current: page,
            pages: totalPages
        });

    } catch (error) {
        console.error("Error loading limited edition products:", error);
        return res.redirect("/pageNotFound");
    }
};




const loadSearchedProducts = async (req, res) => {
    try {
        const searchQuery = req.query.search?.trim() || "";
        const userId = req.user?._id || req.session?.user;
        const sort = req.query.sort || "default";
        const selectedBrands = req.query.brand;
        const selectedCategories = req.query.category;
        const page = parseInt(req.query.page) || 1;
        const limit = 21;
        const skip = (page - 1) * limit;
        const wishlist = await Wishlist.findOne({ userId });
        const wish = wishlist?.items?.map(item => String(item.variantId.toString())) ?? [];
        const userData = await User.findById(userId);
        const peripherals = await Category.find({ isPeripheral: true, isListed: true });
        const components = await Category.find({ isComponent: true, isListed: true });
        const allBrands = await Brand.find({ isListed: true });
        const allCategories = await Category.find({ isListed: true });
        const matchedBrands = await Brand.find({ name: { $regex: searchQuery, $options: "i" }, isListed: true }).distinct("_id");
        const matchedCategories = await Category.find({ name: { $regex: searchQuery, $options: "i" }, isListed: true }).distinct("_id");
        const sortOption = getSortOption(sort);
        let productFilter = {
            isListed: true, $or: [{ model: { $regex: searchQuery, $options: "i" } }, { description: { $regex: searchQuery, $options: "i" } }, { brand: { $in: matchedBrands } }, { category: { $in: matchedCategories } },],
        };
        if (selectedBrands) {
            const brandNames = Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands];
            const brandIds = await Brand.find({ name: { $in: brandNames } }).distinct("_id");
            productFilter.brand = { $in: brandIds };
        }
        if (selectedCategories) {
            const categoryNames = Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories];
            const categoryIds = await Category.find({ name: { $in: categoryNames } }).distinct("_id");
            productFilter.category = { $in: categoryIds };
        }
        const totalProducts = await Product.countDocuments(productFilter);
        const products = await Product.find(productFilter).populate("brand", "name").populate("category", "name").sort(sortOption).skip(skip).limit(limit);
        const totalPages = Math.ceil(totalProducts / limit);
        const distinctBrandIds = await Product.distinct("brand", { isListed: true });
        const distinctCategoryIds = await Product.distinct("category", { isListed: true });
        let filterBrand = await Brand.find({ _id: { $in: distinctBrandIds } }, { name: 1, _id: 0 });
        filterBrand = filterBrand.map(b => b.name);
        let filterCategory = await Category.find({ _id: { $in: distinctCategoryIds } }, { name: 1, _id: 0 });
        filterCategory = filterCategory.map(c => c.name);
        if (products.length === 0) {
            return res.render("noProductFound", { product: [], peripheral: peripherals, component: components, brand: allBrands, user: userData, filterBrand, filterCategory, selectedBrands: Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands], selectedCategories: Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories], searchQuery, });
        }
        return res.render("productPages", { product: products, peripheral: peripherals, component: components, brand: allBrands, user: userData, filterBrand, filterCategory, selectedBrands: Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands], selectedCategories: Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories], wish, current: page, pages: totalPages, totalProducts, searchQuery, baseRoute: "/products" });
    } catch (error) {
        console.error("Error loading search results:", error);
        return res.redirect("/pageNotFound");
    }
};



const loadForgotPassword = async (req, res) => {
    try {
        return res.render('forgotPassword', { message: null });
    } catch (error) {
        console.error("Error loading the forgot password page: ", error);
        return res.redirect('/pageNotFound');
    }
};



const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.render('forgotPassword', { message: "User not found." })
        }
        const otp = await generateOtp(email);
        const emailSent = await sendEmail(email, otp, user.fullName);
        if (emailSent) {
            return res.render('passwordOtp', { email });
        } else {
            return res.status(500).json({ success: false, message: "Failed to send email" });
        }
    } catch (error) {
        console.error("Error sending the otp for password change: ", error);
        return res.redirect('/pageNotFound');
    }
};



const verify = async (req, res) => {
    try {
        const { otp, email } = req.body;
        let otpDoc = await emailOtp.findOne({ email: email });
        if (!otpDoc) {
            return res.status(400).json({ success: false, message: "OTP expired." });
        }
        if (String(otp) === String(otpDoc.otp)) {
            await emailOtp.deleteMany({ email });
            return res.json({ success: true, redirectUrl: `/newPassword/${email}` });
        } else {
            return res.status(400).json({ success: false, message: "Invalid OTP." });
        }
    } catch (error) {
        console.error("Error verifying the otp for password change: ", error);
        return res.redirect('/pageNotFound');
    }
};



const loadUpdatePassword = async (req, res) => {
    try {
        const email = req.params.email;
        return res.render('changePassword', { email: email });
    } catch (error) {
        console.error("Error loading the otp change page: ", error);
        return res.redirect('/pageNotFound');
    }
};



const updatePassword = async (req, res) => {
    try {
        const email = req.params.email;
        const { newPassword } = req.body;

        const user = await User.findOne({ email: email });
        user.password = newPassword;
        await user.save();
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error updating the password:", error);
        return res.redirect('/pageNotFound');
    }
};



const loadProfilePage = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user
        const user = await User.findById(userId);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        if (!user) {
            return res.redirect('/login');
        } else {
            return res.render('profile', { peripheral, component, user, breadcrumbs: "Profile" });
        }
    } catch (error) {
        console.error("Error loading the profile page: ", error);
        return res.redirect('/pageNotFound');
    }
};



const loadEditProfile = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user
        const user = await User.findById(userId);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        if (!user) {
            return res.redirect('/login');
        } else {
            return res.render('editProfile', { peripheral, component, user, breadcrumbs: "Profile" });
        }
    } catch (error) {
        console.error("Error loading the edit profile page: ", error);
        return res.redirect('/pageNotFound');
    }
};



const updateProfile = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user
        const { fullName, phoneNumber, profileImage } = req.body;
        if (!userId) {
            return res.redirect('/login');
        }
        let user = await User.findByIdAndUpdate(userId, { $set: { fullName: fullName, phoneNumber: phoneNumber, profilePhoto: profileImage } });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.json({ success: true, message: "Profile updated successfully", user: user })
    } catch (error) {
        console.error("Error updating the profile:", error);
        return res.redirect('/pageNotFound');
    }
};



const loadEditPassword = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const user = await User.findById(userId);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        if (!user) {
            return res.redirect('/login');
        }
        return res.render('editPassword', { peripheral, component, user, breadcrumbs: "Profile" });
    } catch (error) {
        console.error("Error loading the editpassword page.");
        return res.render('/pageNotFound');
    }
};



const editPassword = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user
        const { oldPassword, newPassword } = req.body;
        if (!userId) {
            return res.redirect('/login');
        }
        let user = await User.findById(userId);
        const pass = await bcrypt.compare(oldPassword, user.password);
        if (!pass) {
            return res.status(404).json({ success: false, message: "Incorrect password." })
        }
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        user.password = newPassword;
        await user.save();
        return res.json({ success: true, message: "Profile updated successfully", user: user })
    } catch (error) {
        console.error("Error updating the profile:", error);
        return res.redirect('/pageNotFound');
    }
};



export const loadAdresses = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page - 1) * limit;
        const user = await User.findById(userId);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        const addressDoc = await Address.findOne({ userId });
        if (!addressDoc || addressDoc.address.length === 0) {
            return res.render("addresses", { peripheral, component, user, breadcrumbs: "Address", address: [], current: 1, pages: 1, });
        }
        const totalAddresses = addressDoc.address.length;
        const totalPages = Math.ceil(totalAddresses / limit);
        const paginatedAddresses = addressDoc.address.slice(skip, skip + limit);
        return res.render("addresses", { peripheral, component, user, breadcrumbs: "Address", address: paginatedAddresses, current: page, pages: totalPages, });
    } catch (error) {
        console.error("Error loading the address page:", error);
        return res.redirect("/pageNotFound");
    }
};




const loadAddAdresses = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user
        const user = await User.findById(userId);
        if (!user) {
            return res.redirect('/login');
        }
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        const address = await Address.find({ userId: userId });
        return res.render('addAddress', { peripheral, component, user, breadcrumbs: "Address", address });
    } catch (error) {
        console.error("Error loading the address adding page: ", error);
        return res.redirect('/pageNotFound');
    }
};



const addAddress = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        if (!userId) {
            return res.redirect('/login');
        }
        const newAddress = req.body;
        if (!newAddress) {
            return res.json({ success: false, message: "Address not added. Please try again." });
        }
        const existingAddress = await Address.findOne({ userId });
        if (existingAddress) {
            existingAddress.address.push({
                fullName: newAddress.fullName,
                phoneNumber: newAddress.mobileNumber,
                address: newAddress.address,
                district: newAddress.district,
                state: newAddress.state,
                city: newAddress.city,
                pincode: newAddress.pinCode,
                landmark: newAddress.landmark,
            });

            await existingAddress.save();
        } else {
            const address = new Address({
                userId,
                address: [{
                    fullName: newAddress.fullName,
                    phoneNumber: newAddress.mobileNumber,
                    address: newAddress.address,
                    district: newAddress.district,
                    state: newAddress.state,
                    city: newAddress.city,
                    pincode: newAddress.pinCode,
                    landmark: newAddress.landmark,
                }],
            });
            await address.save();
        }
        return res.status(200).json({ success: true, message: "Address added successfully" });
    } catch (error) {
        console.error("Error adding new address:", error);
        return res.redirect('/pageNotFound');
    }
};



const loadEditAddress = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user
        const user = await User.findById(userId);
        if (!user) {
            return res.redirect('/login');
        }
        const addressId = req.params.address;
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        let address = await Address.find({ userId: userId });
        address = address[0].address.find(addr => addr._id.toString() === addressId);
        return res.render('editAddress', { peripheral, component, user, breadcrumbs: "Address", address });
    } catch (error) {
        console.error("Error loading  the address editing page:", error);
        return res.redirect('/pageNotFound');
    }
};



const editAddress = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        if (!userId) {
            return res.redirect("/login");
        }
        const addressId = req.params.address;
        const editedAddress = req.body;
        const userAddressDoc = await Address.findOne({ userId: new mongoose.Types.ObjectId(userId) });
        if (!userAddressDoc) {
            return res.status(404).json({ success: false, message: "User address record not found" });
        }
        const result = await Address.findOneAndUpdate(
            {
                userId: new mongoose.Types.ObjectId(userId),
                "address._id": new mongoose.Types.ObjectId(addressId)
            },
            {
                $set: {
                    "address.$.fullName": editedAddress.fullName,
                    "address.$.phoneNumber": editedAddress.mobileNumber,
                    "address.$.address": editedAddress.address,
                    "address.$.district": editedAddress.district,
                    "address.$.state": editedAddress.state,
                    "address.$.city": editedAddress.city,
                    "address.$.pincode": editedAddress.pinCode,
                    "address.$.landmark": editedAddress.landmark,
                    "address.$.updatedAt": new Date(),
                }
            },
            { new: true }
        );
        return res.status(200).json({
            success: true,
            message: "Address updated successfully",
        });
    } catch (error) {
        console.error("Error editing the address:", error);
        return res.redirect("/pageNotFound");
    }
};



const deleteAddress = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const addressId = req.params.address;
        const result = await Address.updateOne(
            { userId: userId },
            { $pull: { address: { _id: addressId } } }
        );
        if (result.modifiedCount === 0) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }
        res.status(200).json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
        console.error("Error deleting address:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};



export const addToCart = async (req, res) => {
    try {
        const userId = req.user?._id || req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: "User not logged in." });
        }
        const { productId, variantId, quantity } = req.body;
        if (!productId || !variantId || !quantity) {
            return res.status(400).json({ success: false, message: "Invalid product details." });
        }
        if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(variantId)) {
            return res.status(400).json({ success: false, message: "Invalid product or variant ID." });
        }
        const product = await Product.findById(productId).populate("category").populate("brand");
        if (!product) return res.status(404).json({ success: false, message: "Product not found." });

        const variant = product.variants.id(variantId);
        if (!variant) return res.status(404).json({ success: false, message: "Variant not found." });
        if (!product.isListed || !product.category?.isListed || !product.brand?.isListed) {
            return res.status(400).json({ success: false, message: "This product is unavailable for purchase." });
        }
        if (variant.quantity <= 0) {
            return res.status(400).json({ success: false, message: "This product is currently out of stock." });
        }
        let cart = await Cart.findOne({ userId });
        if (!cart) cart = new Cart({ userId, items: [], totalCartValue: 0 });
        const addQty = Number(quantity);
        const maxLimit = 5;
        const existingItem = cart.items.find(
            (item) =>
                item.productId.toString() === productId.toString() &&
                item.variantId.toString() === variantId.toString()
        );
        if (existingItem) {
            if (existingItem.quantity >= variant.quantity) {
                return res.status(400).json({
                    success: false,
                    message: "No more items available.",
                });
            }
            const newQty = existingItem.quantity + addQty;
            if (newQty > variant.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Only ${variant.quantity} units available in stock.`,
                });
            }
            if (newQty > maxLimit) {
                return res.status(400).json({
                    success: false,
                    message: `You can only add up to ${maxLimit} units of this product.`,
                });
            }
            existingItem.quantity = newQty;
            existingItem.subTotal = variant.offer * newQty;
        }
        else {
            if (addQty > variant.quantity)
                return res.status(400).json({
                    success: false,
                    message: `Only ${variant.quantity} units available in stock.`,
                });

            if (addQty > maxLimit)
                return res.status(400).json({
                    success: false,
                    message: `You can only add up to ${maxLimit} units of this product.`,
                });
            cart.items.push({
                productId,
                variantId,
                quantity: addQty,
                subTotal: variant.offer * addQty,
                max: maxLimit,
            });
        }
        cart.totalAmount = cart.items.reduce((sum, i) => sum + i.subTotal, 0);
        await Wishlist.updateOne(
            { userId },
            { $pull: { items: { variantId: new mongoose.Types.ObjectId(variantId) } } }
        );
        await cart.save();
        return res.status(200).json({
            success: true,
            message: existingItem
                ? "Product quantity updated in cart."
                : "Product added to cart successfully.",
            total: cart.totalAmoount,
            cart,
        });
    } catch (error) {
        console.error("Error adding product to cart:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while adding product to cart.",
        });
    }
};



export default { loadHomepage, loadErrorPage, loadSignup, loadSignin, signup, verifyEmailOtp, resendOTP, loadLogin, login, logout, loadPeripheral, loadComponent, loadAllProducts, loadProductDetails, loadLimitedEditions, loadSearchedProducts, loadForgotPassword, sendOtp, verify, loadUpdatePassword, updatePassword, loadProfilePage, loadEditProfile, updateProfile, loadEditPassword, editPassword, loadAdresses, loadAddAdresses, addAddress, loadEditAddress, editAddress, deleteAddress, addToCart, };