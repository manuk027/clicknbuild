import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js"
import Category from "../../models/categorySchema.js";
import Brand from "../../models/brandSchema.js";
import CouponUsage from '../../models/couponUsage.js';
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
import { generateOtp } from '../../helpers/otpGenerator.js';
import { sendEmail } from '../../helpers/otpMailer.js';
import { applyFinalOffer } from "../../helpers/applyFinalOffer.js";
import { applyFinalOfferToAllVariants } from '../../helpers/detailsFinalPrice.js';
import { applyFinalOfferToVariant } from '../../helpers/variantFinalOffer.js'

dotenv.config();



const loadHomepage = async (req, res, next) => {
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



const loadErrorPage = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const userData = await User.findById(userId);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        return res.render("errorPage", { statusCode: 404, message: "Page Not found." });
    } catch (err) {
        res.redirect("/pageNotFound");
    }
};



const loadSignup = async (req, res, next) => {
    try {
        if (req.user?._id || req.session?.user) {
            return res.redirect('/')
        }
        const referralCode = req.query.refToken || '';
        return res.render("signup", { message: null, referralCode : referralCode? referralCode: null, });
    } catch (error) {
        console.error("Error loading the signup page");
        next(error);
    }
};



// const loadSignin = async (req, res, next) => {
//     try {
//         if (req.user?._id || req.session?.user) {
//             return res.redirect('/')
//         }
//         return res.render("signin");
//     } catch (error) {
//         console.error(err);
//         next(error);
//     }
// };



const signup = async (req, res, next) => {
    try {
        const { fullName, email, password, confirmPassword, referralCode } = req.body;
        const renderSignup = (message) => res.render("signup", { message, referralCode: referralCode || '' });
        if (password !== confirmPassword) {
            return renderSignup("Password do not match");
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return renderSignup("User with the same email already exists.");
        }
        if (referralCode) {
            const validRefferal = await User.findOne({ referralCode });
            if (!validRefferal) {
                return renderSignup("Invalid referral code, Check the referralcode.");
            }
        }
        const otp = await generateOtp(email);
        const emailSent = await sendEmail(email, otp, fullName);
        if (!emailSent) {
            return res.json("email-error");
        }
        req.session.userOtp = otp;
        req.session.userData = { fullName, email, password, referralCode };
        res.render("emailOTPVerification", { email });
    } catch (error) {
        console.error("Signup Error", error);
        next(error);
    }
};



const verifyEmailOtp = async (req, res, next) => {
    try {
        const { otp, email, } = req.body;
        let fetchOTP = await emailOtp.findOne({ email });
        if (!fetchOTP) {
            return res.json({ success: false, message: "OTP expired." });
        }
        if (String(otp) === String(fetchOTP.otp)) {
            const userData = req.session.userData;
            let referredUser = null;
            if (userData.referralCode && userData.referralCode.trim() !== "") {
                referredUser = await User.findOne({ referralCode: userData.referralCode.trim() });
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
                    }).save();
                }
            }

            const newUser = new User({
                fullName: userData.fullName,
                email: userData.email,
                password: userData.password,
                referedBy: referredUser ? referredUser._id : null,
            });
            await newUser.save();
            newUser.referralCode = await generateUniqueReferralCode(newUser._id.toString());
            await newUser.save();
            req.session.user = newUser._id;
            await emailOtp.deleteMany({ email });
            return res.json({ success: true, redirectUrl: "/" });
        } else {
            return res.status(400).json({ success: false, message: "Invalid OTP." });
        }
    } catch (error) {
        console.error("Error verifying OTP", error);
        next(error);
    }
};



const resendOTP = async (req, res, next) => {
    try {
        const user = req.session.userData;
        if (!user || !user.email) {
            return res.json({ success: false, message: "User session not found." });
        }
        const { fullName, email } = user;
        await emailOtp.deleteMany({ email });
        const otp = await generateOtp(email);
        const emailSent = await sendEmail(email, otp, fullName);
        if (!emailSent) {
            return res.json({ success: false, message: "Failed to resend OTP.", });
        }
        return res.json({ success: true, message: "OTP resent successfully.", });
    } catch (error) {
        console.error("Error resending OTP:", error);
        next(error);
    }
};



const loadLogin = async (req, res, next) => {
    try {
        if (req.user && !req.user.isBlocked) {
            return res.redirect('/');
        }
        return res.render('login', { message: null });
    } catch (error) {
        console.error(error);
        return res.redirect('/pageNotFound');
    }
};




/** 
@desc Logs a user in either with credential or google auth.
@route POST/login
@access Public
*/
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.render('login', { message: "Enter email and password" });
        }
        const findUser = await User.findOne({ isAdmin: false, email, });
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
        next(error);
    }
};



/**
 @desc    Log out the current user by destroying the session.
 @route   GET /logout
 @access  Private
 */
const logout = async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Sesssion destroy error", err);
            return res.redirect('/pageNotFound');
        }
        return res.redirect("/");
    });
};



/**
 @desc    Shows all the products and category of Peripherals
 @route   GET /pheripheral/:name
 @access  Public
 */
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
        const wish = wishlist?.items?.map(item => item.variantId.toString()) ?? [];
        const category = await Category.findOne({ name: peripheral, isListed: true });
        if (!category) return res.redirect("/pageNotFound");
        const sortOption = getSortOption(sort);
        let productFilter = { category: category._id, isListed: true };
        if (selectedBrands) {
            const brandNames = Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands];
            const brandIds = await Brand.find({ name: { $in: brandNames }, isListed: true }).distinct("_id");
            if (brandIds.length === 0) return res.redirect("/pageNotFound");
            productFilter.brand = { $in: brandIds };
        }
        if (selectedCategories) {
            const categoryNames = Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories];
            const categoryIds = await Category.find({ name: { $in: categoryNames }, isListed: true }).distinct("_id");
            if (categoryIds.length === 0) return res.redirect("/pageNotFound");
            productFilter.category = { $in: categoryIds };
        }
        const totalProducts = await Product.countDocuments(productFilter);
        let rawProducts = await Product.find(productFilter).populate({ path: "brand", select: "name isListed", match: { isListed: true } }).populate({ path: "category", select: "name isListed", match: { isListed: true } }).sort(sortOption).skip(skip).limit(limit);
        rawProducts = rawProducts.filter(p => p.brand && p.category);
        rawProducts = rawProducts.map(p => applyFinalOffer(p, category));
        const totalPages = Math.ceil(totalProducts / limit);
        const peripherals = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        const fullProducts = await Product.find({ category: category._id, isListed: true }).select("brand category");
        const distinctBrandIds = [...new Set(fullProducts.map(p => p.brand?.toString()))].filter(Boolean);
        const distinctCategoryIds = [...new Set(fullProducts.map(p => p.category?.toString()))].filter(Boolean);
        const brand = await Brand.find({ _id: { $in: distinctBrandIds }, isListed: true });
        const filterBrand = brand.map(b => b.name);
        const categoryList = await Category.find({ _id: { $in: distinctCategoryIds }, isListed: true });
        const filterCategory = categoryList.map(c => c.name);
        const userData = await User.findById(userId);
        if (rawProducts.length === 0) return res.render("noProductFound", { product: rawProducts, peripheral: peripherals, component, brand, user: userData });
        res.render("productPages", { product: rawProducts, peripheral: peripherals, component, brand, user: userData, filterBrand, filterCategory, selectedBrands: Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands], selectedCategories: Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories], route: "peripheral", name: peripheral, wish, baseRoute: `/peripheral/${peripheral}`, current: page, pages: totalPages, totalProducts, sort });
    } catch (error) {
        console.error("Error loading peripherals:", error);
        return res.redirect("/pageNotFound");
    }
};



/**
 @desc    Shows all the products and category of Components
 @route   GET /component/:name
 @access  Public
 */
const loadComponent = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const componentName = req.params.name;
        const sort = req.query.sort || "default";
        const selectedBrands = req.query.brand;
        const selectedCategories = req.query.category;
        const page = Number(req.query.page) || 1;
        const limit = 21;
        const skip = (page - 1) * limit;
        const category = await Category.findOne({ name: componentName, isListed: true });
        if (!category) return res.redirect("/pageNotFound");
        const wishlist = await Wishlist.findOne({ userId });
        const wish = wishlist?.items?.map(item => item.variantId.toString()) ?? [];
        const sortOption = getSortOption(sort);
        const filter = { category: category._id, isListed: true };
        if (selectedBrands) {
            const brandNames = Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands];
            const brandIds = await Brand.find({ name: { $in: brandNames }, isListed: true }).distinct("_id");
            if (brandIds.length === 0) return res.redirect("/pageNotFound");
            filter.brand = { $in: brandIds };
        }
        if (selectedCategories) {
            const categoryNames = Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories];
            const categoryIds = await Category.find({ name: { $in: categoryNames }, isListed: true }).distinct("_id");
            if (categoryIds.length === 0) return res.redirect("/pageNotFound");
            filter.category = { $in: categoryIds };
        }
        let rawProducts = await Product.find(filter).populate({ path: "brand", select: "name isListed", match: { isListed: true } }).populate({ path: "category", select: "name isListed", match: { isListed: true } }).sort(sortOption).skip(skip).limit(limit);
        rawProducts = rawProducts.filter(p => p.brand && p.category);
        rawProducts = rawProducts.map(p => applyFinalOffer(p, category));
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const components = await Category.find({ isComponent: true, isListed: true });
        const fullProducts = await Product.find({ category: category._id, isListed: true }).select("brand category");
        const distinctBrandIds = [...new Set(fullProducts.map(p => p.brand?.toString()))].filter(Boolean);
        const distinctCategoryIds = [...new Set(fullProducts.map(p => p.category?.toString()))].filter(Boolean);
        const brand = await Brand.find({ _id: { $in: distinctBrandIds }, isListed: true });
        const filterBrand = brand.map(b => b.name);
        const categoryDocs = await Category.find({ _id: { $in: distinctCategoryIds }, isListed: true });
        const filterCategory = categoryDocs.map(c => c.name);
        const userData = await User.findById(userId);
        if (rawProducts.length === 0) return res.render("noProductFound", { product: rawProducts, peripheral, component: components, brand, user: userData });
        res.render("productPages", { product: rawProducts, peripheral, component: components, brand, user: userData, filterBrand, filterCategory, selectedBrands: Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands], selectedCategories: Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories], route: "component", name: componentName, wish, baseRoute: `/component/${componentName}`, current: page, pages: totalPages, totalProducts, sort });
    } catch (error) {
        console.error("Error loading components:", error);
        next(error);
    }
};



/**
 @desc    Shows all the products
 @route   GET /shop
 @access  Public
 */
const loadAllProducts = async (req, res, next) => {
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
        if (selectedBrands) filter.brand = Array.isArray(selectedBrands) ? { $in: selectedBrands } : selectedBrands;
        if (selectedCategories) filter.category = Array.isArray(selectedCategories) ? { $in: selectedCategories } : selectedCategories;
        if (searchQuery) filter.$or = [{ model: { $regex: searchQuery, $options: "i" } }, { description: { $regex: searchQuery, $options: "i" } }];
        const validBrands = await Brand.find({ isListed: true }).select("_id");
        const validCategories = await Category.find({ isListed: true }).select("_id");
        filter.brand = filter.brand || { $in: validBrands.map(b => b._id) };
        filter.category = filter.category || { $in: validCategories.map(c => c._id) };
        const totalProducts = await Product.countDocuments(filter);
        let allProducts = await Product.find(filter).populate("brand", "name isListed").populate("category", "name maxOffer isListed").sort(sortOption).skip(skip).limit(limit);
        allProducts = allProducts.filter(p => p.brand && p.category);
        allProducts = allProducts.map(p => applyFinalOffer(p, p.category));
        const totalPages = Math.ceil(totalProducts / limit);
        const userData = await User.findById(userId);
        const peripherals = await Category.find({ isPeripheral: true, isListed: true });
        const components = await Category.find({ isComponent: true, isListed: true });
        const fullProducts = await Product.find(filter).select("brand category");
        const allBrandIds = [...new Set(fullProducts.map(p => p.brand?.toString()))].filter(Boolean);
        const allCategoryIds = [...new Set(fullProducts.map(p => p.category?.toString()))].filter(Boolean);
        const brandDocs = await Brand.find({ _id: { $in: allBrandIds } }).select("name");
        const filterBrand = brandDocs.map(b => b.name);
        const categoryDocs = await Category.find({ _id: { $in: allCategoryIds } }).select("name");
        const filterCategory = categoryDocs.map(c => c.name);
        const selectedBrandsArray = selectedBrands ? Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands] : [];
        const selectedCategoriesArray = selectedCategories ? Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories] : [];
        if (allProducts.length === 0) return res.render("noProductFound", { product: [], peripheral: peripherals, component: components, brand: brandDocs, user: userData, filterBrand, filterCategory, selectedBrands: selectedBrandsArray, selectedCategories: selectedCategoriesArray, searchQuery });
        res.render("productPages", { product: allProducts, peripheral: peripherals, component: components, user: userData, filterBrand, filterCategory, selectedBrands: selectedBrandsArray, selectedCategories: selectedCategoriesArray, wish, current: page, pages: totalPages, totalProducts, searchQuery, baseRoute: "/shop" });
    } catch (error) {
        console.error("Error loading all products:", error);
        next(error);
    }
};



/**
 @desc    Shows details of the product
 @route   GET /product
 @access  Public
 */
const loadProductDetails = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const variantId = req.query.variant || null;
        const prodId = req.query.id;
        const userData = await User.findById(userId);
        const peripherals = await Category.find({ isPeripheral: true, isListed: true });
        const components = await Category.find({ isComponent: true, isListed: true });
        const wishlist = await Wishlist.findOne({ userId });
        const wish = wishlist?.items?.map(item => item.variantId.toString()) ?? [];
        let product = await Product.findOne({ _id: prodId, isListed: true }).populate({ path: "category", match: { isListed: true }, select: "name maxOffer isListed" }).populate({ path: "brand", match: { isListed: true }, select: "name isListed" });
        if (!product || !product.brand || !product.category) return res.redirect("/pageNotFound");
        product = applyFinalOfferToAllVariants(product, product.category);
        let selectedVariant;
        if (variantId) {
            selectedVariant = product.variants.find(v => v._id.toString() === variantId);
            if (!selectedVariant) return res.redirect("/pageNotFound");
        } else {
            selectedVariant = product.variants[0];
        }
        let recommendedProducts = await Product.find({ category: product.category._id, isListed: true }).populate({ path: "brand", match: { isListed: true }, select: "name" }).populate({ path: "category", match: { isListed: true }, select: "name maxOffer" }).limit(4);
        recommendedProducts = recommendedProducts.filter(p => p.brand && p.category);
        recommendedProducts = recommendedProducts.map(p => applyFinalOfferToAllVariants(p, p.category));
        return res.render("productDetails", { product, selectedVariant, peripheral: peripherals, component: components, user: userData, recommendedProducts, wish });
    } catch (error) {
        console.error("Error loading the product details page:", error);
        next(error);
    }
};



/**
 @desc    Show all the flash sale product
 @route   GET /shop/limitedEdition
 @access  Public
 */
const loadLimitedEditions = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const page = parseInt(req.query.page) || 1;
        const limit = 21;
        const skip = (page - 1) * limit;
        const selectedBrands = req.query.brand;
        const selectedCategories = req.query.category;
        const sort = req.query.sort;
        const sortOption = getSortOption(sort);
        const wishlist = await Wishlist.findOne({ userId });
        const wish = wishlist?.items?.map(item => String(item.variantId)) ?? [];
        const filter = { onFlashSale: true, isListed: true };
        if (selectedBrands) filter["brand.name"] = Array.isArray(selectedBrands) ? { $in: selectedBrands } : selectedBrands;
        if (selectedCategories) filter["category.name"] = Array.isArray(selectedCategories) ? { $in: selectedCategories } : selectedCategories;
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);
        let products = await Product.find(filter).populate("brand", "name").populate("category", "name maxOffer").sort(sortOption).skip(skip).limit(limit);
        products = products.map(p => applyFinalOffer(p, p.category));
        const userData = await User.findById(userId);
        const peripherals = await Category.find({ isPeripheral: true, isListed: true });
        const components = await Category.find({ isComponent: true, isListed: true });
        const distinctBrandIds = [...new Set(products.map(p => p.brand?._id))].filter(Boolean);
        const distinctCategoryIds = [...new Set(products.map(p => p.category?._id))].filter(Boolean);
        const brandDocs = await Brand.find({ _id: { $in: distinctBrandIds } });
        const filterBrand = brandDocs.map(b => b.name);
        const categoryDocs = await Category.find({ _id: { $in: distinctCategoryIds } });
        const filterCategory = categoryDocs.map(c => c.name);
        const selectedBrandsArray = selectedBrands ? Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands] : [];
        const selectedCategoriesArray = selectedCategories ? Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories] : [];
        if (products.length === 0) return res.render("noProductFound", { product: products, peripheral: peripherals, component: components, brand: brandDocs, user: userData, filterBrand, filterCategory, selectedBrands: selectedBrandsArray, selectedCategories: selectedCategoriesArray });
        return res.render("productPages", { product: products, peripheral: peripherals, component: components, user: userData, filterBrand, filterCategory, selectedBrands: selectedBrandsArray, selectedCategories: selectedCategoriesArray, wish, baseRoute: "/shop/limitedEditions", current: page, pages: totalPages });
    } catch (error) {
        console.error("Error loading limited edition products:", error);
        next(error);
    }
};



/**
 @desc    Load the product based on the search(brand, cateogory and name)
 @route   GET /product
 @access  Public
 */
const loadSearchedProducts = async (req, res, next) => {
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
        const wish = wishlist?.items?.map(item => String(item.variantId)) ?? [];
        const userData = await User.findById(userId);
        const peripherals = await Category.find({ isPeripheral: true, isListed: true });
        const components = await Category.find({ isComponent: true, isListed: true });
        const allBrands = await Brand.find({ isListed: true });
        const allCategories = await Category.find({ isListed: true });
        const matchedBrands = await Brand.find({ name: { $regex: searchQuery, $options: "i" }, isListed: true }).distinct("_id");
        const matchedCategories = await Category.find({ name: { $regex: searchQuery, $options: "i" }, isListed: true }).distinct("_id");
        const sortOption = getSortOption(sort);
        let productFilter = { isListed: true, $or: [{ model: { $regex: searchQuery, $options: "i" } }, { brand: { $in: matchedBrands } }, { category: { $in: matchedCategories } }] };
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
        let products = await Product.find(productFilter).populate("brand", "name").populate("category", "name maxOffer").sort(sortOption).skip(skip).limit(limit);
        products = products.map(p => applyFinalOffer(p, p.category));
        const totalPages = Math.ceil(totalProducts / limit);
        const resultBrandIds = [...new Set(products.map(p => p.brand?._id))];
        const resultCategoryIds = [...new Set(products.map(p => p.category?._id))];
        let filterBrandDocs = await Brand.find({ _id: { $in: resultBrandIds } });
        const filterBrand = filterBrandDocs.map(b => b.name);
        let filterCategoryDocs = await Category.find({ _id: { $in: resultCategoryIds } });
        const filterCategory = filterCategoryDocs.map(c => c.name);
        const selectedBrandsArray = selectedBrands ? Array.isArray(selectedBrands) ? selectedBrands : [selectedBrands] : [];
        const selectedCategoriesArray = selectedCategories ? Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories] : [];
        if (products.length === 0) return res.render("noProductFound", { product: [], peripheral: peripherals, component: components, brand: allBrands, user: userData, filterBrand, filterCategory, selectedBrands: selectedBrandsArray, selectedCategories: selectedCategoriesArray, searchQuery });
        return res.render("productPages", { product: products, peripheral: peripherals, component: components, brand: allBrands, user: userData, filterBrand, filterCategory, selectedBrands: selectedBrandsArray, selectedCategories: selectedCategoriesArray, wish, current: page, pages: totalPages, totalProducts, searchQuery, baseRoute: "/products" });
    } catch (error) {
        console.error("Error loading search results:", error);
        next(error);
    }
};



/**
 @desc    Load the forgot password page
 @route   GET /forgotPassword
 @access  Public
 */
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
        let otpDoc = await emailOtp.findOne({ email });
        if (!otpDoc) {
            return res.status(400).json({ success: false, message: "OTP expired." });
        }
        if (String(otp) === String(otpDoc.otp)) {
            await emailOtp.deleteMany({ email });
            req.session.allowedResetEmail = email;
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
        if (req.session.allowedResetEmail !== email) {
            return res.redirect('/forgotPassword');
        }
        return res.render('changePassword', { email });
    } catch (error) {
        console.error("Error loading the otp change page: ", error);
        return res.redirect('/pageNotFound');
    }
};




const updatePassword = async (req, res) => {
    try {
        const email = req.params.email;
        if (req.session.allowedResetEmail !== email) {
            return res.status(403).json({ success: false, message: "Unauthorized request" });
        }
        const { newPassword } = req.body;
        const user = await User.findOne({ email });
        user.password = newPassword;
        await user.save();
        req.session.allowedResetEmail = null;
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error updating the password:", error);
        return res.redirect('/pageNotFound');
    }
};



/**
 @desc    Load the user profile section
 @route   GET /profile
 @access  Private
 */
const loadProfilePage = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.session?.user
        const user = await User.findById(userId);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        return res.render('profile', { peripheral, component, user, breadcrumbs: "Profile" });

    } catch (error) {
        console.error("Error loading the profile page: ", error);
        next(error);
    }
};


/**
 @desc    Load the user profile section
 @route   GET /editProfile
 @access  Private
 */
const loadEditProfile = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.session?.user
        const user = await User.findById(userId);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        return res.render('editProfile', { peripheral, component, user, breadcrumbs: "Profile" });
    } catch (error) {
        console.error("Error loading the edit profile page: ", error);
        next(error);
    }
};


/**
 @desc    Update the profile in database
 @route   PUT /editProfile
 @access  Private
 */
const updateProfile = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        if (!userId) {
            return res.redirect('/login');
        }
        const { fullName, phoneNumber, profileImage } = req.body;
        const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
        if (fullName && !nameRegex.test(fullName.trim())) {
            return res.json({ success: false, message: "Full name should contain only letters and spaces." });
        }
        const phoneRegex = /^[0-9]{10}$/;
        if (phoneNumber && !phoneRegex.test(phoneNumber)) {
            return res.json({ success: false, message: "Phone number must be 10 digits and contain only numbers." });
        }
        const updateData = {};
        if (fullName) updateData.fullName = fullName.trim();
        if (phoneNumber) updateData.phoneNumber = phoneNumber;
        if (profileImage) updateData.profilePhoto = profileImage;
        const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        return res.json({ success: true, message: "Profile updated successfully", user });
    } catch (error) {
        console.error("Error updating the profile:", error);
        return res.json({ success: false, message: "Server error while updating profile" });
    }
};



/**
 @desc    Load the edit password section
 @route   GET /editPassword
 @access  Private
 */
const loadEditPassword = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const user = await User.findById(userId);
        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });
        return res.render('editPassword', { peripheral, component, user, breadcrumbs: "Profile" });
    } catch (error) {
        console.error("Error loading the editpassword page.");
        next(error);
    }
};


/**
 @desc    Edit the password in database
 @route   PUT /editPassword
 @access  Private
 */
const editPassword = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Old password and new password are required." });
        }
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])[^\s]{8,}$/;
        if (!strongPasswordRegex.test(newPassword)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "New password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special symbol." });
        }
        let user = await User.findById(userId);
        if (!user) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "User not found." });
        }
        if (user.googleId && !user.password) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Password cannot be changed for Google-authenticated accounts." });
        const isOldPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordCorrect) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Incorrect old password." });
        }
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "New password cannot be the same as the old password." });
        }
        user.password = newPassword;
        await user.save();
        return res.status(HttpStatus.OK).json({ success: true, message: "Password updated successfully." });
    } catch (error) {
        console.error("Error updating password:", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error while updating password."
        });
    }
};



/**
 @desc    Load the address page on the uer side
 @route   GET /addresses
 @access  Private
 */
export const loadAdresses = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page - 1) * limit;
        const [user, peripheral, component, addressDoc] = await Promise.all([User.findById(userId), Category.find({ isPeripheral: true, isListed: true }), Category.find({ isComponent: true, isListed: true }), Address.findOne({ userId })])
        const renderData = { peripheral, component, user, breadcrumbs: "Address" };
        if (!addressDoc || addressDoc.address.length === 0) {
            return res.render("addresses", { ...renderData, address: [], current: 1, pages: 1, });
        }
        const totalAddresses = addressDoc.address.length;
        const totalPages = Math.ceil(totalAddresses / limit);
        const paginatedAddresses = addressDoc.address.slice(skip, skip + limit);
        return res.render("addresses", { ...renderData, address: paginatedAddresses, current: page, pages: totalPages, });
    } catch (error) {
        console.error("Error loading the address page:", error);
        next(error);
    }
};



/**
 @desc    Load the address adding page on the uer side
 @route   GET /address
 @access  Private
 */
const loadAddAdresses = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.session?.user
        const [user, peripheral, component,] = await Promise.all([User.findById(userId), Category.find({ isPeripheral: true, isListed: true }), Category.find({ isComponent: true, isListed: false })])
        return res.render('addAddress', { peripheral, component, user, breadcrumbs: "Address", });
    } catch (error) {
        console.error("Error loading the address adding page: ", error);
        next(error);
    }
};



/**
 @desc    Add the address to the collection verifying the data
 @route   POST /address
 @access  Private
 */
const addAddress = async (req, res) => {
    try {
        const userId = req.user?.id || req.session?.user;
        const { fullName, mobileNumber, address, district, state, city, pinCode, landmark } = req.body;
        const letterRegex = /^[A-Za-z ]+$/;
        const phoneRegex = /^\d{10}$/;
        const pinRegex = /^\d{6}$/;
        if (!fullName || !letterRegex.test(fullName)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Full name must contain only letters." });
        }
        if (!mobileNumber || !phoneRegex.test(mobileNumber)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Phone number must be 10 digits." });
        }
        if (!address) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Address cannot be empty." });
        }
        if (!district || !letterRegex.test(district)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "District must contain only letters." });
        }
        if (!state || !letterRegex.test(state)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "State must contain only letters." });
        }
        if (!city || !letterRegex.test(city)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "City must contain only letters." });
        }
        if (!pinCode || !pinRegex.test(pinCode)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Pincode must be 6 digits and should not contain any other characters." });
        }
        const newAddress = { fullName, phoneNumber: mobileNumber, address, district, state, city, pincode: pinCode, landmark };
        const existingAddress = await Address.findOne({ userId });
        if (existingAddress) {
            existingAddress.address.push(newAddress);
            await existingAddress.save();
        } else {
            await Address.create({ userId, address: [newAddress], });
        }
        return res.status(HttpStatus.OK).json({ success: true, message: "Address added successfully." });
    } catch (error) {
        console.error("Error adding new address:", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong, please try again." });
    }
};



/**
 @desc    load the edit address page
 @route   GET /editAddress/:address
 @access  Private
 */
export const loadEditAddress = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const addressId = req.params.address;
        if (!userId) return res.redirect("/login");
        const [user, peripheral, component, addressDoc] = await Promise.all([User.findById(userId), Category.find({ isPeripheral: true, isListed: true }), Category.find({ isComponent: true, isListed: true }), Address.findOne({ userId })]);
        if (!addressDoc) return res.redirect("/addresses");
        const address = addressDoc.address.find(addr => addr._id.toString() === addressId);
        if (!address) return res.redirect("/addresses");
        return res.render("editAddress", { peripheral, component, user, breadcrumbs: "Address", address });
    } catch (error) {
        console.error("Error loading the address editing page:", error);
        next(error);
    }
};



/**
 @desc    Edit the address in the collection verifying the data
 @route   PUT /editAddress/:address
 @access  Private
 */
const editAddress = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const addressId = req.params.address;
        const { fullName, mobileNumber, address, district, state, city, pinCode, landmark, } = req.body;
        const letterRegex = /^[A-Za-z ]+$/;
        const phoneRegex = /^\d{10}$/;
        const pinRegex = /^\d{6}$/;
        if (!fullName || !letterRegex.test(fullName)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Full name must contain only letters." });
        }
        if (!mobileNumber || !phoneRegex.test(mobileNumber)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Phone number must be 10 digits." });
        }
        if (!address) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Address cannot be empty." });
        }
        if (!district || !letterRegex.test(district)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "District must contain only letters." });
        }
        if (!state || !letterRegex.test(state)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "State must contain only letters." });
        }
        if (!city || !letterRegex.test(city)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "City must contain only letters." });
        }
        if (!pinCode || !pinRegex.test(pinCode)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Pincode must be 6 digits and should not contain any other characters." });
        }
        const addressDoc = await Address.find({ userId, "address._id": addressId });
        if (!addressDoc) {
            return res.status(400).json({ success: false, message: "Address not found or does not belong to this user." });
        }
        await Address.updateOne(
            { userId, "address._id": addressId },
            { $set: { "address.$.fullName": fullName, "address.$.phoneNumber": mobileNumber, "address.$.address": address, "address.$.district": district, "address.$.state": state, "address.$.city": city, "address.$.pincode": pinCode, "address.$.landmark": landmark, "address.$.updatedAt": new Date(), } }
        )
        return res.status(HttpStatus.OK).json({ success: true, message: "Address updated successfully" });
    } catch (error) {
        console.error("Error editing the address:", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
    }
};



/**
 @desc    Delete the address in the collection verifying the data
 @route   DELETE /deleteAddress/:address
 @access  Private
 */
const deleteAddress = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user;
        const addressId = req.params.address;
        const addressDoc = await Address.findOne({ userId, "address._id": addressId });
        if (!addressDoc) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Address not found or not associated with this user." });
        }
        await Address.updateOne({ userId }, { $pull: { address: { _id: addressId } } });
        return res.status(HttpStatus.OK).json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
        console.error("Error deleting address:", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
    }
};


/**
 @desc    Add product to the cart and update the quantity
 @route   POST /cart/add
 @access  Private
 */
export const addToCart = async (req, res) => {
    try {
        const userId = req.user?._id || req.session.user;
        if (!userId) return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: "User not logged in." });
        const { productId, variantId, quantity } = req.body;
        const addQty = Number(quantity);
        const maxLimit = 5;
        if (!productId || !variantId || !quantity) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Missing product details, please try again." });
        if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(variantId)) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Invalid product or variant selected." });
        const product = await Product.findById(productId).populate("category").populate("brand");
        if (!product) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "The selected product not found." });
        const variant = product.variants.id(variantId);
        if (!variant) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "The product variant is no longer available." });
        if (!product.isListed || !product.category?.isListed || !product.brand?.isListed) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "This product is currently unavailable for purchase." });
        if (variant.quantity <= 0) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "This product is currently out of stock." });
        const finalUnitPrice = applyFinalOfferToVariant(variant, product.category);
        let cart = await Cart.findOne({ userId });
        if (!cart) cart = new Cart({ userId, items: [], totalAmount: 0 });
        const existingItem = cart.items.find((item) => item.productId.toString() === productId.toString() && item.variantId.toString() === variantId.toString());
        const checkQuantity = (newQty) => {
            if (newQty > variant.quantity) return `Only ${variant.quantity} unit(s) left in stock`;
            if (newQty > maxLimit) return `You can purchase a maximum of ${maxLimit} units of this product`;
            return null;
        };
        if (existingItem) {
            const newQty = existingItem.quantity + addQty;
            const qtyError = checkQuantity(newQty);
            if (qtyError) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: qtyError });
            existingItem.quantity = newQty;
            existingItem.subTotal = finalUnitPrice * newQty;
            existingItem.unitPrice = finalUnitPrice;
        } else {
            const qtyError = checkQuantity(addQty);
            if (qtyError) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: qtyError });
            cart.items.push({ productId, variantId, quantity: addQty, unitPrice: finalUnitPrice, subTotal: finalUnitPrice * addQty, max: maxLimit });
        }
        cart.totalAmount = cart.items.reduce((sum, item) => sum + item.subTotal, 0);
        await Wishlist.updateOne({ userId }, { $pull: { items: { variantId: variantId } } });
        await cart.save();
        return res.status(HttpStatus.OK).json({ success: true, message: existingItem ? "Product quantity updated in your cart." : "Product successfully added to your cart.", total: cart.totalAmount, cart });
    } catch (error) {
        console.error("Error adding product to cart:", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Something went wrong, please try again later."
        });
    }
};




export default { loadHomepage, loadErrorPage, loadSignup, signup, verifyEmailOtp, resendOTP, loadLogin, login, logout, loadPeripheral, loadComponent, loadAllProducts, loadProductDetails, loadLimitedEditions, loadSearchedProducts, loadForgotPassword, sendOtp, verify, loadUpdatePassword, updatePassword, loadProfilePage, loadEditProfile, updateProfile, loadEditPassword, editPassword, loadAdresses, loadAddAdresses, addAddress, loadEditAddress, editAddress, deleteAddress, addToCart, };