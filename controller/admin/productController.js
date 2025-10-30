import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import Brand from "../../models/brandSchema.js";
import User from '../../models/userSchema.js';
import fs from 'fs';
import path from "path";
import sharp from 'sharp';
import cloudinary from "../../config/cloudinary.js";
import brandSortOption from "../../helpers/brandSort.js"

const loadProduct = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const sort = req.query.sort;
        const sortOption = brandSortOption(sort);
        const limit = 10;
        const skip = (page - 1) * limit;
        const products = await Product.find({})
            .populate("category", "name")
            .populate("brand", "name")
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        const category = await Category.findById(products._id);
        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / limit);
        res.render('products', { product: products, current: page, pages: totalPages, totalProducts: totalProducts, limit: limit, category: category, sort, search: req.query.search || "" });
    } catch (error) {
        console.error('Error loading the product page: ', error);
        return res.redirect('/admin/pageNotFound');
    }
}

const loadAddProduct = async (req, res) => {
    try {
        let category = await Category.find();
        let brand = await Brand.find().sort({name: 1});
        return res.render('addProducts', { category: category, brand: brand });
    } catch (error) {
        console.error("Error loading the add product page: ", error);
        return res.redirect('/admin/pageNotFound');
    }
}

const addProduct = async (req, res) => {
    try {

        const {
            brand,
            productName,
            description,
            category,
            status = "listed",
            categoryType = "component",
            limitedEdition = false,
            flashSale = false,
            variants = [],
            specifications = [],
            images = []
        } = req.body;

        if (!brand || !productName || !category)
            return res.json({ success: false, message: "Missing required fields" });

        if (!images.length)
            return res.json({ success: false, message: "Please upload at least one image" });

        // Convert flags and status
        const isListed = status === "listed";
        const isComponent = categoryType === "component";
        const isPeripheral = categoryType === "peripheral";
        const isLimited = limitedEdition === true || limitedEdition === "true";
        const onFlashSale = flashSale === true || flashSale === "true";

        // Clean variants and specifications
        const validVariants = variants.filter(v => v.variant && v.price && v.quantity)
            .map(v => ({
                variant: v.variant,
                quantity: Number(v.quantity),
                price: Number(v.price),
                offer: Number(v.offer || 0)
            }));

        const validSpecs = specifications.filter(s => s.title && s.details)
            .map(s => ({ title: s.title, details: s.details }));

        if (validVariants.length === 0)
            return res.json({ success: false, message: "Please add at least one valid variant" });

        const newProduct = new Product({
            brand,
            model: productName,
            description,
            isListed,
            images,
            variants: validVariants,
            specification: validSpecs,
            isComponent,
            isPeripheral,
            onFlashSale,
            isLimited,
            category,
            rating: 0
        });

        await newProduct.save();

        return res.json({ success: true, message: "Product added successfully" });
    } catch (error) {
        console.error('Add product error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


const listProduct = async (req, res) => {
    try {
        let id = req.query.id;
        const page = req.query.page || 1;
        await Product.updateOne({ _id: id }, { $set: { isListed: true } });
        res.redirect(`/admin/products/?page=${page}`);
    } catch (error) {
        console.error("Error listing the product:", error);
        return res.redirect('/admin/pageNotFound');
    }
}

const unListProduct = async (req, res) => {
    try {
        let id = req.query.id;
        const page = req.query.page || 1;
        await Product.updateOne({ _id: id }, { $set: { isListed: false } });
        res.redirect(`/admin/products/?page=${page}`);
    } catch (error) {
        console.error("Error listing the product:", error);
        return res.redirect('/admin/pageNotFound');
    }
}

const viewVariants = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.json({ success: false, message: "Product ID is required" });

        const product = await Product.findById(id).lean();
        if (!product) return res.json({ success: false, message: "Product not found" });

        return res.json({ success: true, product });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const loadEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.redirect('/admin/pageNotFound');

        const product = await Product.findById(id).lean();
        const brand = await Brand.find();
        const category = await Category.find();
        if (!product) return res.redirect('/admin/pageNotFound');
        res.render('editProduct', { product, brand, category });
    } catch (error) {
        console.error("Error loading the edit product page: ", error);
        return res.redirect('/admin/pageNotFound');
    }
};



const editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        const {
            brand, productName, description, category,
            status = "listed", categoryType = "component",
            limitedEdition = false, flashSale = false,
            variants = [], specifications = [], images = []
        } = req.body;

        if (!brand || !productName || !category)
            return res.json({ success: false, message: "Missing required fields" });

        if (!images.length)
            return res.json({ success: false, message: "Please upload at least one image" });

        const isListed = status === "listed";
        const isComponent = categoryType === "component";
        const isPeripheral = categoryType === "peripheral";
        const isLimited = limitedEdition === true || limitedEdition === "true";
        const onFlashSale = flashSale === true || flashSale === "true";

        const validVariants = variants.filter(v => v.variant && v.price && v.quantity)
            .map(v => ({
                variant: v.variant,
                quantity: Number(v.quantity),
                price: Number(v.price),
                offer: Number(v.offer || 0)
            }));

        const validSpecs = specifications.filter(s => s.title && s.details)
            .map(s => ({ title: s.title, details: s.details }));

        if (validVariants.length === 0)
            return res.json({ success: false, message: "Please add at least one valid variant" });

        product.brand = brand;
        product.model = productName;
        product.description = description;
        product.isListed = isListed;
        product.isComponent = isComponent;
        product.isPeripheral = isPeripheral;
        product.isLimited = isLimited;
        product.onFlashSale = onFlashSale;
        product.category = category;
        product.variants = validVariants;
        product.specification = validSpecs;
        product.images = images; 

        await product.save();

        return res.json({ success: true, message: "Product updated successfully" });
    } catch (error) {
        console.error("Update product error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


export default { loadProduct, loadAddProduct, addProduct, unListProduct, listProduct, viewVariants, editProduct, loadEditProduct };