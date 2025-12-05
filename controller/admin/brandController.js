import Brand from '../../models/brandSchema.js';
import { fileURLToPath } from 'url';
import cloudinary from "../../config/cloudinary.js";
import brandSortOption from "../../helpers/brandSort.js"
import { HttpStatus } from '../../helpers/statusCodes.js';



const loadBrand = async (req, res, next) => {
    try {
        const { page = 1, sort = "name", search = "" } = req.query;
        const currentPage = parseInt(page) || 1;
        const limit = 10;
        const skip = (currentPage - 1) * limit;
        const trimmedSearch = search.trim();
        const searchQuery = trimmedSearch ? { name: { $regex: trimmedSearch, $options: "i" } } : {};
        const sortOption = brandSortOption(sort);
        const [brandData, totalBrand] = await Promise.all([(Brand.find(searchQuery)).sort(sortOption).skip(skip).limit(limit), Brand.countDocuments(searchQuery)])
        const totalPages = Math.ceil(totalBrand / limit);
        res.render("brands", { brand: brandData, data: brandData, current: currentPage, pages: totalPages, totalBrand, limit, sort, search: trimmedSearch });
    } catch (error) {
        console.error("Error loading brand:", error);
        next(error);
    }
};



const loadAddBrand = async (req, res, next) => {
    try {
        res.render('addBrand');
    } catch (error) {
        console.error("Error loading add brand page: ", error);
        next(error);
    }
}



const addBrand = async (req, res) => {
    try {
        const brand = req.body.brandName.toLowerCase();
        const findBrand = await Brand.findOne({ name: { $regex: `^${brand}$`, $options: "i" } });
        if (findBrand) {
            return res.status(HttpStatus.CONFLICT).json({ success: false, message: "Brand with the name same already exists." });
        }
        const newBrand = new Brand({ name: brand, image: req.file.path, });
        await newBrand.save();
        return res.status(HttpStatus.OK).json({ success: true, message: "Brand added successfully." });
    } catch (error) {
        console.error("Error adding brand: ", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, messag: 'Internal server Error' });
    }
};



const listBrand = async (req, res) => {
    try {
        const { id, page = 1 } = req.query;
        if (!id) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Product was not listed." });
        }
        await Brand.updateOne({ _id: id }, { $set: { isListed: true } });
        return res.redirect(`/admin/brands/?page=${page}`);
    } catch (error) {
        console.error("Error listing the brand:", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Inernal server error." });
    }
}



const unListBrand = async (req, res) => {
    try {
        const { id, page = 1 } = req.query;
        if (!id) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Product was not listed." });
        }
        await Brand.updateOne({ _id: id }, { $set: { isListed: false } });
        return res.redirect(`/admin/brands/?page=${page}`);
    } catch (error) {
        console.error("Error listing the brand:", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Inernal server error." });
    }
}



const loadEditBrand = async (req, res) => {
    try {
        const id = req.query.id;
        const brand = await Brand.findOne({ _id: id });
        res.render('editBrand', { brand: brand });
    } catch (error) {
        console.error('Error loading edit brand:', error);
        next(error);
    }
}



const editBrand = async (req, res) => {
    try {
        const id = req.query.id;
        const { brandName } = req.body;
        if (!id) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Brnad cannot be edited." });
        if (!brandName) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Brand name cannot be empty." });
        const brand = await Brand.findById(id);
        if (!brand) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Brand cannot be edited" });
        const existingBrand = await Brand.findOne({ name: { $regex: new RegExp(`^${brandName}$`, "i") } });
        if (existingBrand && existingBrand._id.toString() !== id) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Brand name already exists. Please choose another name." });
        }
        const updateData = { name: brandName.trim() };
        if (req.file) {
            try {
                if (brand.image) {
                    const segments = brand.image.split('/');
                    const filename = segments[segments.length - 1].split(".")[0];
                    const folder = "re-image";
                    const publicid = `${folder}/${filename}`;
                    await cloudinary.uploader.destroy(publicid);
                }
                updateData.image = req.file.path;
            } catch (error) {
                console.error("Cloudinary image delete error: ", error);
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to change the image. Try agian." });
            }
        } else {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Image not selected" });
        }
        const updatedBrand = await Brand.findByIdAndUpdate(id, { $set: updateData }, { new: true });
        if (!updatedBrand) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Failed to update details." });
        return res.status(HttpStatus.OK).json({ success: true, message: "Brand updated successfully !", redirectUrl: "/admin/brands" });
    } catch (error) {
        console.error("Error editing brand:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


export default { loadBrand, loadAddBrand, addBrand, unListBrand, listBrand, editBrand, loadEditBrand };