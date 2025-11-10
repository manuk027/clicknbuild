import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js"
import Category from "../../models/categorySchema.js";
import Brand from "../../models/brandSchema.js"
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import emailOtp from "../../models/otp.js";
import getSortOption from "../../helpers/productSort.js";
import bcrypt from "bcryptjs";
import Address from "../../models/addressSchema.js";
import mongoose from "mongoose";
import Cart from "../../models/cartSchema.js"
import Wishlist from '../../models/wishlistSchema.js';



dotenv.config();



const loadHomepage = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const userData = await User.findById(userId);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        const brand = await Brand.find();
        const product = await Product.find({ isListed: true }).populate("brand", "name");
        if (!userId) {
            return res.render("home", { user: null, peripheral: peripheral, component: component, brand: brand, product: product });
        }
        if (!userData || userData.isBlocked) {
            delete req.session.user;

            return res.render("home", {
                user: null,
                peripheral,
                component,
                brand,
                product
            });
        } else {
            return res.render("home", {
                user: userData,
                peripheral,
                component,
                brand,
                product
            });
        }

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
};



const loadErrorPage = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const userData = await User.findById(userId);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        return res.render("errorPage", { user: userData, peripheral: peripheral, component: component });
    } catch (err) {
        res.redirect("/pageNotFound");
    }
};



const loadSignup = async (req, res) => {
    try {
        if (req.user?._id || req.session?.user) {
            return res.redirect('/')
        }
        return res.render("signup", { message: null });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
};



const loadSignin = async (req, res) => {
    try {
        if (req.user?._id || req.session?.user) {
            return res.redirect('/')
        }
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
        console.log(password);
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
        const sort = req.query.sort;
        const selectedBrands = req.query.brand;
        const selectedCategories = req.query.category;
        const category = await Category.findOne({ name: peripheral });
        if (!category) {
            return res.redirect("/pageNotFound");
        }
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
        const product = await Product.find(productFilter).populate("brand", "name").populate("category", "name").sort(sortOption);
        const peripherals = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        const distinctBrandIds = [...new Set(product.map(p => p.brand?._id))].filter(Boolean);
        const distinctCategoryIds = [...new Set(product.map(p => p.category?._id))].filter(Boolean);
        const brand = await Brand.find({ _id: { $in: distinctBrandIds } });
        const filterBrand = brand.map(b => b.name);
        const categoryList = await Category.find({ _id: { $in: distinctCategoryIds } });
        const filterCategory = categoryList.map(c => c.name);
        if (product.length === 0) {
            return res.render("noProductFound", { product, peripheral: peripherals, component, brand, user: userData, });
        }
        res.render("productPages", {
            product, peripheral: peripherals, component, brand, user: userData, filterBrand, filterCategory, selectedBrands: Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands], selectedCategories: Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories], route: "peripheral", name: peripheral,
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
        const sort = req.query.sort;
        const selectedBrands = req.query.brand;
        const selectedCategories = req.query.category;
        const category = await Category.findOne({ name: componentName });
        const sortOption = getSortOption(sort);
        if (!category) {
            return res.redirect("/pageNotFound");
        }
        const filter = { category: category._id, isListed: true };
        if (selectedBrands) {
            const brandDocs = await Brand.find({ name: Array.isArray(selectedBrands) ? { $in: selectedBrands } : selectedBrands, });
            const brandIds = brandDocs.map((b) => b._id);
            filter.brand = { $in: brandIds };
        }
        if (selectedCategories) {
            const categoryDocs = await Category.find({ name: Array.isArray(selectedCategories) ? { $in: selectedCategories } : selectedCategories, });
            const categoryIds = categoryDocs.map((c) => c._id);
            filter.category = { $in: categoryIds };
        }
        const products = await Product.find(filter).populate("brand", "name").populate("category", "name").sort(sortOption);
        const userData = await User.findById(userId);
        const peripherals = await Category.find({ isPeripheral: true, isListed: true });
        const components = await Category.find({ isComponent: true, isListed: true });
        const distinctBrandIds = [...new Set(products.map((p) => p.brand?._id))].filter(Boolean);
        const distinctCategoryIds = [...new Set(products.map((p) => p.category?._id))].filter(Boolean);
        const brand = await Brand.find({ _id: { $in: distinctBrandIds } });
        const filterBrand = brand.map((b) => b.name);
        const categoryList = await Category.find({ _id: { $in: distinctCategoryIds } });
        const filterCategory = categoryList.map((c) => c.name);
        const selectedBrandsArray = selectedBrands === undefined ? [] : Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands];
        const selectedCategoriesArray = selectedCategories === undefined ? [] : Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories];
        if (products.length === 0) {
            return res.render("noProductFound", { product: products, peripheral: peripherals, component: components, brand, user: userData, filterBrand, filterCategory, selectedBrands: selectedBrandsArray, selectedCategories: selectedCategoriesArray, });
        }
        res.render("productPages", {
            product: products, peripheral: peripherals, component: components, brand, user: userData, filterBrand, filterCategory, selectedBrands: selectedBrandsArray, selectedCategories: selectedCategoriesArray, route: "component", name: componentName,
        });
    } catch (error) {
        console.error("Error loading components:", error);
        return res.redirect("/pageNotFound");
    }
};



const loadAllProducts = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const selectedBrands = req.query.brand;
        const selectedCategories = req.query.category;
        const sort = req.query.sort;
        const sortOption = getSortOption(sort);
        const wishlist = await Wishlist.findOne({ userId });
        const wish = wishlist?.items?.map(item => String(item.variantId.toString())) ?? [];
        const filter = { isListed: true };

        if (selectedBrands) {
            filter["brand"] = Array.isArray(selectedBrands)
                ? { $in: selectedBrands }
                : selectedBrands;
        }

        if (selectedCategories) {
            filter["category"] = Array.isArray(selectedCategories)
                ? { $in: selectedCategories }
                : selectedCategories;
        }

        const allProducts = (
            await Product.find(filter)
                .populate({ path: "brand", match: { isListed: true }, select: "name" })
                .populate({ path: "category", match: { isListed: true }, select: "name" })
                .sort(sortOption)
        ).filter(p => p.brand && p.category);

        const userData = await User.findById(userId);
        const peripherals = await Category.find({ isPeripheral: true, isListed: true });
        const components = await Category.find({ isComponent: true, isListed: true });

        const distinctBrandIds = [...new Set(allProducts.map(p => p.brand?._id))].filter(Boolean);
        const distinctCategoryIds = [...new Set(allProducts.map(p => p.category?._id))].filter(Boolean);

        const brand = await Brand.find({ _id: { $in: distinctBrandIds } });
        const filterBrand = brand.map(b => b.name);

        const categoryList = await Category.find({ _id: { $in: distinctCategoryIds } });
        const filterCategory = categoryList.map(c => c.name);

        const selectedBrandsArray = selectedBrands
            ? Array.isArray(selectedBrands)
                ? selectedBrands
                : [selectedBrands]
            : [];

        const selectedCategoriesArray = selectedCategories
            ? Array.isArray(selectedCategories)
                ? selectedCategories
                : [selectedCategories]
            : [];

        if (allProducts.length === 0) {
            return res.render("noProductFound", {
                product: allProducts,
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
        console.log(wish);
        res.render("productPages", {
            product: allProducts,
            peripheral: peripherals,
            component: components,
            brand,
            user: userData,
            filterBrand,
            filterCategory,
            selectedBrands: selectedBrandsArray,
            selectedCategories: selectedCategoriesArray,
            wish,
        });
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
        console.log(wish);
        return res.render("productDetails", { product, peripheral: peripherals, component: components, user: userData, recommendedProducts, index: variant, wish });
    } catch (error) {
        console.error("Error loading the product details page:", error);
        return res.redirect("/pageNotFound");
    }
};



const loadLimitedEditions = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;

        // Extract filters and sort options from query
        const selectedBrands = req.query.brand;
        const selectedCategories = req.query.category;
        const sort = req.query.sort;
        const sortOption = getSortOption(sort);

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

        // Fetch products based on filter
        const products = await Product.find(filter)
            .populate("brand", "name")
            .populate("category", "name")
            .sort(sortOption);

        // Fetch additional data
        const userData = await User.findById(userId);
        const peripherals = await Category.find({ isPeripheral: true, isListed: true });
        const components = await Category.find({ isComponent: true, isListed: true });

        // Get distinct brands and categories from current product set
        const distinctBrandIds = [...new Set(products.map(p => p.brand?._id))].filter(Boolean);
        const distinctCategoryIds = [...new Set(products.map(p => p.category?._id))].filter(Boolean);

        const brand = await Brand.find({ _id: { $in: distinctBrandIds } });
        const filterBrand = brand.map(b => b.name);

        const categoryList = await Category.find({ _id: { $in: distinctCategoryIds } });
        const filterCategory = categoryList.map(c => c.name);

        // Handle query values (single or array)
        const selectedBrandsArray =
            selectedBrands === undefined
                ? []
                : Array.isArray(selectedBrands)
                    ? selectedBrands
                    : [selectedBrands];

        const selectedCategoriesArray =
            selectedCategories === undefined
                ? []
                : Array.isArray(selectedCategories)
                    ? selectedCategories
                    : [selectedCategories];

        // Render appropriate view
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
        const sort = req.query.sort;
        const selectedBrands = req.query.brand;
        const selectedCategories = req.query.category;
        const userData = await User.findById(userId);
        const peripherals = await Category.find({ isPeripheral: true, isListed: true });
        const components = await Category.find({ isComponent: true, isListed: true });
        const allBrands = await Brand.find();
        const matchedBrands = await Brand.find({ name: { $regex: searchQuery, $options: "i" }, isListed: true }).distinct("_id");
        const matchedCategories = await Category.find({ name: { $regex: searchQuery, $options: "i" }, isListed: true }).distinct("_id");
        let sortOption = getSortOption(sort);
        let productFilter = { $or: [{ model: { $regex: searchQuery, $options: "i" } }, { brand: { $in: matchedBrands } }, { category: { $in: matchedCategories } }] };
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
        const products = await Product.find(productFilter).populate("brand").populate("category").sort(sortOption);
        const distinctBrandIds = await Product.distinct("brand");
        const distinctCategoryIds = await Product.distinct("category");
        let filterBrand = await Brand.find({ _id: { $in: distinctBrandIds } }, { name: 1, _id: 0 });
        filterBrand = filterBrand.map(b => b.name);
        let filterCategory = await Category.find({ _id: { $in: distinctCategoryIds } }, { name: 1, _id: 0 });
        filterCategory = filterCategory.map(c => c.name);
        return res.render("productPages", {
            product: products,
            peripheral: peripherals,
            component: components,
            brand: allBrands,
            user: userData,
            filterBrand,
            filterCategory,
            selectedBrands: Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands],
            selectedCategories: Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories],
        });
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
        console.log(otpDoc)
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
        console.log(email);
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

        console.log("Email:", email);
        console.log("New Password:", newPassword);

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



const loadAdresses = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user
        const user = await User.findById(userId);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        const address = await Address.find({ userId: userId });
        if (!user) {
            return res.redirect('/login');
        } else {
            return res.render('addresses', { peripheral, component, user, breadcrumbs: "Address", address });
        }
    } catch (error) {
        console.error("Error loading the address page: ", error);
        return res.redirect('/pageNotFound');
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
        console.log(addressId);
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
    if (!userId) return errorResponse(res, 401, "User not logged in.");

    const { productId, variantId, quantity } = req.body;
    if (!productId || !variantId || !quantity)
      return errorResponse(res, 400, "Invalid product details.");

    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(variantId))
      return errorResponse(res, 400, "Invalid ID format.");

    const product = await Product.findById(productId)
      .populate("category")
      .populate("brand");

    if (!product) return errorResponse(res, 404, "Product not found.");

    const variant = product.variants.id(variantId);
    if (!variant) return errorResponse(res, 404, "Variant not found.");

    if (!product.isListed || !product.category?.isListed || !product.brand?.isListed)
      return errorResponse(res, 400, "This product or its brand/category is unavailable.");

    if (variant.quantity <= 0)
      return errorResponse(res, 400, "This product is currently out of stock.");

    let cart = await Cart.findOne({ userId }) || new Cart({ userId, items: [], totalCartValue: 0 });

    const existingItem = cart.items.find(
      (item) =>
        item.productId?.toString() === productId.toString() &&
        item.variantId?.toString() === variantId.toString()
    );

    const addedQuantity = Number(quantity);

    if (existingItem) {
      const newQuantity = existingItem.quantity + addedQuantity;

      // ✅ Check against available stock
      if (newQuantity > variant.quantity)
        return errorResponse(res, 400, `Only ${variant.quantity} units available in stock.`);

      // ✅ Check against max limit in cart item
      if (newQuantity > existingItem.max)
        return errorResponse(
          res,
          400,
          `You can only add up to ${existingItem.max} units of this product.`
        );

      existingItem.quantity = newQuantity;
      existingItem.subTotal = variant.offer * newQuantity;
    } else {
      // ✅ New item addition
      const newItem = {
        productId,
        variantId,
        quantity: addedQuantity,
        subTotal: variant.offer * addedQuantity,
        max: 5, // default limit per item (can adjust per product logic if needed)
      };

      if (addedQuantity > variant.quantity)
        return errorResponse(res, 400, `Only ${variant.quantity} units available in stock.`);

      if (addedQuantity > newItem.max)
        return errorResponse(
          res,
          400,
          `You can only add up to ${newItem.max} units of this product.`
        );

      cart.items.push(newItem);
    }

    // ✅ Recalculate total
    cart.totalCartValue = cart.items.reduce((sum, item) => sum + item.subTotal, 0);
    await cart.save();

    return res.status(200).json({
      success: true,
      message: existingItem
        ? "Product quantity updated in cart."
        : "Product added to cart successfully.",
      cart,
    });
  } catch (error) {
    console.error("Error adding product to cart:", error);
    return errorResponse(res, 500, "Internal server error while adding product to cart.");
  }
};




export default { loadHomepage, loadErrorPage, loadSignup, loadSignin, signup, verifyEmailOtp, resendOTP, loadLogin, login, logout, loadPeripheral, loadComponent, loadAllProducts, loadProductDetails, loadLimitedEditions, loadSearchedProducts, loadForgotPassword, sendOtp, verify, loadUpdatePassword, updatePassword, loadProfilePage, loadEditProfile, updateProfile, loadEditPassword, editPassword, loadAdresses, loadAddAdresses, addAddress, loadEditAddress, editAddress, deleteAddress, addToCart, };