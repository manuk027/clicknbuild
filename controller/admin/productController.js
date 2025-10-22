import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import Brand from "../../models/brandSchema.js";
import User from '../../models/userSchema.js';
import fs from 'fs';
import path from "path";
import sharp from 'sharp';

const loadProduct = async(req, res)=> {
    try {
         const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        const categoryData = await Category.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);
        res.render('products', { category: categoryData, data: categoryData, current: page, pages: totalPages, totalCategories: totalCategories, limit: limit });
    } catch (error) {
        console.error('Error loading the product page: ', error);
        return res.redirect('/pageNotFound');
    }
}

const loadAddProduct = async (req, res)=> {
    try {
        let category = await Category.find();
        let brand = await Brand.find();
        console.log(category)
        return res.render('addProducts', {category: category, brand: brand});
    } catch (error) {
        console.log("Error loading the add product page: ", error);
        return res.redirect('/pageNotFound');
    }
}

export default {loadProduct, loadAddProduct};