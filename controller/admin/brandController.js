import Brand from '../../models/brandSchema.js';
import Product from '../../models/productSchema.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cloudinary from "../../config/cloudinary.js";
import brandSortOption from "../../helpers/brandSort.js"



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const loadBrand = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const sort = req.query.sort || "name";
        const sortOption = brandSortOption(sort);
        const limit = 10;
        const skip = (page - 1) * limit;
        const searchTerm = req.query.search ? req.query.search.trim() : "";
        const searchQuery = searchTerm ? { name: { $regex: searchTerm, $options: "i" } } : {};
        const brandData = await Brand.find(searchQuery).sort(sortOption).skip(skip).limit(limit);
        const totalBrand = await Brand.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalBrand / limit);
        res.render("brands", { brand: brandData, data: brandData, current: page, pages: totalPages, totalBrand, limit, sort, search: searchTerm });
    } catch (error) {
        console.error("Error loading brand:", error);
        return res.redirect("/admin/pageNotFound");
    }
};



const loadAddBrand = async (req, res) => {
    try {
        res.render('addBrand');
    } catch (error) {
        console.error("Error loading add brand page: ", error);
        return res.redirect('/admin/pageNotFound');
    }
}



const addBrand = async (req, res) => {
    try {
        const brand = req.body.brandName;
        const findBrand = await Brand.findOne({ name: brand });
        if (findBrand) {
            return res.redirect('/admin/brands?error=BrandAlreadyExists');
        }
        const image = req.file;
        const newBrand = new Brand({
            name: brand,
            image: image.path,
        });
        await newBrand.save();
        res.redirect("/admin/brands");
    } catch (error) {
        console.error("Error adding brand: ", error);
        res.redirect('/admin/pageNotFound');
    }
};



const listBrand = async (req, res) => {
    try {
        let id = req.query.id;
        const page = req.query.page || 1;
        await Brand.updateOne({ _id: id }, { $set: { isListed: true } });
        res.redirect(`/admin/brands/?page=${page}`);
    } catch (error) {
        console.error("Error listing the brand:", error);
        return res.redirect('/pageNotFound');
    }
}



const unListBrand = async (req, res) => {
    try {
        let id = req.query.id;
        const page = req.query.page || 1;
        await Brand.updateOne({ _id: id }, { $set: { isListed: false } });
        res.redirect(`/admin/brands/?page=${page}`);
    } catch (error) {
        console.error("Error unlisting the brand:", error);
        return res.redirect('/pageNotFound');
    }
}



const loadEditBrand = async (req, res) => {
    try {
        const id = req.query.id;
        const brand = await Brand.findOne({ _id: id });
        res.render('editBrand', { brand: brand });
    } catch (error) {
        console.error('Error loading edit brand:', error);
        res.redirect('/pageNotFound');
    }
}



const editBrand = async (req, res) => {
    try {
        const id = req.query.id;
        const { brandName } = req.body;
        const brand = await Brand.findById(id);
        if (!brand) {
            return res.status(404).json({ success: false, message: "Brand not found" });
        }
        const existingBrand = await Brand.findOne({ name: brandName });
        if (existingBrand && existingBrand._id.toString() !== id) {
            return res.json({ success: false, message: "Brand already exists. Please choose another name." });
        }
        const updateData = { name: brandName };
        if (req.file) {
            if (brand.image) {
                const segments = brand.image.split("/");
                const filename = segments[segments.length - 1].split(".")[0];
                const folder = "re-image";
                const publicId = `${folder}/${filename}`;
                await cloudinary.uploader.destroy(publicId);
            }
            updateData.image = req.file.path;
        }
        const updatedBrand = await Brand.findByIdAndUpdate(id, { $set: updateData }, { new: true });
        if (updatedBrand) {
            res.status(200).json({success: true, message: "Brand updated successfully", redirectUrl: "/admin/brands"
            });
        } else {
            res.status(400).json({ success: false, message: "Failed to update brand" });
        }

    } catch (error) {
        console.error("Error editing brand:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


export default { loadBrand, loadAddBrand, addBrand, unListBrand, listBrand, editBrand, loadEditBrand };