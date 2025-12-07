import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import Brand from "../../models/brandSchema.js";
import brandSortOption from "../../helpers/brandSort.js"
import productService from "../../services/productService.js";
import { HttpStatusCode } from "axios";
import { HttpStatus } from '../../helpers/statusCodes.js';


const loadProduct = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const sort = req.query.sort || "";
        const sortOption = brandSortOption(sort);
        const searchTerm = req.query.search?.trim() || "";
        const searchQuery = searchTerm ? { model: { $regex: searchTerm, $options: "i" } } : {};
        const totalProducts = await Product.countDocuments(searchQuery);
        const products = await Product.find(searchQuery).populate("category", "name").populate("brand", "name").sort(sortOption).skip(skip).limit(limit);
        const totalPages = Math.ceil(totalProducts / limit);
        return res.render("products", { product: products, current: page, pages: totalPages, totalProducts, limit, sort, search: searchTerm });
    } catch (error) {
        console.error("Error loading the product page:", error);
        next(error);
    }
};



const loadAddProduct = async (req, res) => {
    try {
        const [categories, brands] = await Promise.all([Category.find(), Brand.find().sort({ name: 1 })]);
        return res.render("addProducts", { category: categories, brand: brands });
    } catch (error) {
        console.error("Error loading the add product page:", error);
        next(error);
    }
};



const addProduct = async (req, res) => {
    try {

        const { brand, productName, description, category, status = "listed", categoryType = "component", limitedEdition = false, flashSale = false, variants = [], specifications = [], images = [] } = req.body;
        if (!brand) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Brand should not be blank." });
        if (!productName) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Product name should not be blank." });
        if (!description) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Description is required." });
        if (!category) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Category should not be blank." });
        const brandExists = await Brand.findById(brand);
        if (!brandExists) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Selected brand does not exist." });
        const categoryExists = await Category.findById(category);
        if (!categoryExists) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Selected category does not exist." });
        if (!Array.isArray(images) || images.length !== 4) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Exactly 4 product images are required." });
        if (!Array.isArray(variants) || variants.length === 0) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Add at least one product variant." });
        const validVariants = [];
        const isInvalidNumber = (value) => { return value === undefined || value === null || isNaN(value) || Number(value) <= 0; };
        for (let i = 0; i < variants.length; i++) {
            const v = variants[i];
            const row = `row ${i + 1}`;
            if (!v.variant || !v.variant.trim()) return res.status(400).json({ success: false, message: `Variant name is required (${row}).` });
            if (isInvalidNumber(v.quantity)) return res.status(400).json({ success: false, message: `Quantity must be a positive number (${row}).` });
            if (isInvalidNumber(v.price)) return res.status(400).json({ success: false, message: `Price must be a positive number (${row}).` });
            if (v.offer === undefined || v.offer === null || isNaN(v.offer) || Number(v.offer) < 0) return res.status(400).json({ success: false, message: `Offer must be a valid number and cannot be negative (${row}).` });
            if (Number(v.offer) >= Number(v.price)) return res.status(400).json({ success: false, message: `Offer must be less than the price (${row}).` });
            validVariants.push({ variant: v.variant.trim(), quantity: Number(v.quantity), price: Number(v.price), offer: Number(v.offer) });
        }
        if (!Array.isArray(specifications) || specifications.length === 0) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Add at least one product specification." });
        const validSpecs = [];
        for (let i = 0; i < specifications.length; i++) {
            const s = specifications[i];
            if (!s.title || !s.title.trim()) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: `Specification title is required (row ${i + 1}).` });
            if (!s.details || !s.details.trim()) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: `Specification details are required (row ${i + 1}).` });
            validSpecs.push({ title: s.title.trim(), details: s.details.trim() });
        }
        const isListed = status === "listed";
        const isComponent = categoryType === "component";
        const isPeripheral = categoryType === "peripheral";
        const isLimited = limitedEdition === true || limitedEdition === "true";
        const onFlashSale = flashSale === true || flashSale === "true";
        const newProduct = new Product({ brand, model: productName, description, category, images, variants: validVariants, specification: validSpecs, isListed, isComponent, isPeripheral, isLimited, onFlashSale, rating: 0 });
        await newProduct.save();
        return res.status(HttpStatus.Ok).json({ success: true, message: "Product added successfully." });
    } catch (error) {
        console.error("Add product error:", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error." });
    }
};



const listProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const page = parseInt(req.query.page, 10) || 1;
        if (!id) return res.redirect("/admin/pageNotFound");
        await Product.updateOne({ _id: id }, { $set: { isListed: true } });
        return res.redirect(`/admin/products/?page=${page}`);
    } catch (error) {
        console.error("Error listing the product:", error);
        return res.status(500).json({ success: false, message: "Internal server error while listing the product." });
    }
};



const unListProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const page = parseInt(req.query.page, 10) || 1;
        if (!id) return res.redirect("/admin/pageNotFound");
        await Product.updateOne({ _id: id }, { $set: { isListed: false } });
        return res.redirect(`/admin/products/?page=${page}`);
    } catch (error) {
        console.error("Error unlisting the product:", error);
        return res.status(500).json({ success: false, message: "Internal server error while unlisting the product." });
    }
};



const viewVariants = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Product not found." });
        const product = await Product.findById(id).lean();
        if (!product) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Product not found" });
        return res.json({ success: true, product });
    } catch (err) {
        console.error(err);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
    }
};



const loadEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) next();
        const product = await Product.findById(id).lean();
        if (!product) return res.redirect("/admin/pageNotFound");
        const [brands, categories] = await Promise.all([Brand.find(), Category.find()]);
        return res.render("editProduct", { product, brand: brands, category: categories });
    } catch (error) {
        console.error("Error loading the edit product page:", error);
        next(error);
    }
};



export const editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { brand, productName, description, category, status = "listed", categoryType = "component", limitedEdition = false, flashSale = false, variants = [], specifications = [], images = [] } = req.body;
        if (!brand) return res.status(400).json({ success: false, message: "Brand should not be blank." });
        if (!productName) return res.status(400).json({ success: false, message: "Product name should not be blank." });
        if (!description) return res.status(400).json({ success: false, message: "Description is required." });
        if (!category) return res.status(400).json({ success: false, message: "Category should not be blank." });
        const brandExists = await Brand.findById(brand);
        if (!brandExists) return res.status(400).json({ success: false, message: "Selected brand does not exist." });
        const categoryExists = await Category.findById(category);
        if (!categoryExists) return res.status(400).json({ success: false, message: "Selected category does not exist." });
        if (!Array.isArray(images) || images.length !== 4) return res.status(400).json({ success: false, message: "Exactly 4 product images are required." });
        if (!Array.isArray(variants) || variants.length === 0) return res.status(400).json({ success: false, message: "At least one product variant is required." });
        const validVariants = [];
        const isInvalidNum = (value) => value === undefined || value === null || isNaN(value) || Number(value) <= 0;
        for (let i = 0; i < variants.length; i++) {
            const v = variants[i];
            const row = `row ${i + 1}`;
            if (!v.variant || !v.variant.trim()) return res.status(400).json({ success: false, message: `Variant name is required (${row}).` });
            if (isInvalidNum(v.quantity)) return res.status(400).json({ success: false, message: `Quantity must be a positive number (${row}).` });
            if (isInvalidNum(v.price)) return res.status(400).json({ success: false, message: `Price must be a positive number (${row}).` });
            if (v.offer === undefined || v.offer === null || isNaN(v.offer) || Number(v.offer) < 0) return res.status(400).json({ success: false, message: `Offer must be a valid number and cannot be negative (${row}).` });
            if (Number(v.offer) >= Number(v.price)) return res.status(400).json({ success: false, message: `Offer must be less than the price (${row}).` });
            validVariants.push({ _id: v._id || null, variant: v.variant.trim(), quantity: Number(v.quantity), price: Number(v.price), offer: Number(v.offer) });
        }
        if (!Array.isArray(specifications) || specifications.length === 0) return res.status(400).json({ success: false, message: "At least one product specification is required." });
        const validSpecs = [];
        for (let i = 0; i < specifications.length; i++) {
            const s = specifications[i];
            const row = i + 1;
            if (!s.title || !s.title.trim()) return res.status(400).json({ success: false, message: `Specification title is required (row ${row}).` });
            if (!s.details || !s.details.trim()) return res.status(400).json({ success: false, message: `Specification details are required (row ${row}).` });
            validSpecs.push({ title: s.title.trim(), details: s.details.trim() });
        }
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) return res.status(404).json({ success: false, message: "Product not found." });
        const finalVariants = validVariants.map((v) => {
            if (v._id) {
                const oldVariant = existingProduct.variants.find((ev) => ev._id.toString() === v._id.toString());
                if (oldVariant) { return { _id: oldVariant._id, variant: v.variant, quantity: v.quantity, price: v.price, offer: v.offer }; }
            }
            return { variant: v.variant, quantity: v.quantity, price: v.price, offer: v.offer };
        });
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { brand, model: productName, description, category, images, variants: finalVariants, specification: validSpecs, isListed: status === "listed", isComponent: categoryType === "component", isPeripheral: categoryType === "peripheral", isLimited: limitedEdition === true || limitedEdition === "true", onFlashSale: flashSale === true || flashSale === "true" },
            { new: true }
        );
        return res.status(200).json({ success: true, message: "Product updated successfully.", });
    } catch (error) {
        console.error("Update product error:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};





export default { loadProduct, loadAddProduct, addProduct, unListProduct, listProduct, viewVariants, editProduct, loadEditProduct };