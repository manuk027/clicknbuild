//importing necessary modules and functions
import Category from "../../models/categorySchema.js";
import Product from "../../models/productSchema.js";
import brandSortOption from "../../helpers/brandSort.js"
import { HttpStatus } from "../../helpers/statusCodes.js";



//function to load category information in admin side
const categoryInfo = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const searchTerm = req.query.search ? req.query.search.trim() : "";
        const searchQuery = searchTerm ? { name: { $regex: searchTerm, $options: "i" } } : {};
        const sort = req.query.sort || "name";
        const sortOption = brandSortOption(sort);
        const categoryData = await Category.find(searchQuery).sort(sortOption).skip(skip).limit(limit);
        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);
        res.render('category', { category: categoryData, data: categoryData, current: page, pages: totalPages, totalCategories: totalCategories, limit: limit, sort, search: searchTerm });
    } catch (error) {
        console.error("Error loding category: ", error);
        next(error);
    }
}



const loadAddCategory = async (req, res, next) => {
    try {
        res.render('addCategory');
    } catch (error) {
        console.error('Error loading category add page', error);
        next(error);
    }
}



//function to add category in admin side
const addCategory = async (req, res) => {
    try {
        let { name, description, maxOffer, isPeripheral, isComponent } = req.body;
        name = name.trim();
        description = description.trim();
        if (!name || !description) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Name and description are required" });
        if (maxOffer !== undefined && maxOffer !== "") {
            const offerValue = Number(maxOffer);
            if (isNaN(offerValue) || offerValue < 0 || offerValue > 100) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Offer must be  a number between 0 and 100." });
            maxOffer = offerValue;
        }
        isPeripheral = isPeripheral === "true" || isPeripheral === true;
        isComponent = isComponent === "true" || isComponent === true;
        const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
        if (existingCategory) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Category already exists." });
        const newCategory = new Category({ name, description, maxOffer: maxOffer ?? 0, isPeripheral, isComponent });
        await newCategory.save();
        return res.status(HttpStatus.OK).json({ success: false, message: "Category added successfully!" });
    } catch (error) {
        console.error("Error adding category:", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
    }
};



// const deleteCategory = async (req, res) => {
//     const { id } = req.params;
//     try {
//         const category = await Category.findById(id);
//         if (!category) {
//             return res.status(404).json({ success: false, message: "Category not found" });
//         }
//         await Category.findByIdAndDelete(id);
//         return res.json({ success: true, message: "Category deleted successfully" });
//     } catch (error) {
//         console.error("Error deleting category:", error);
//         return res.status(500).json({ success: false, message: "Internal server error" });
//     }
// }



const addCategoryOffer = async (req, res) => {
    try {
        const { percentage, categoryId } = req.body;
        const offerValue = Number(percentage);
        if (isNaN(offerValue) || offerValue < 0 || offerValue > 100) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Offer percentage should be a number between 0 and 100." });
        const category = await Category.findById(categoryId);
        if (!category) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Category not found" });
        const products = await Product.find({ category: categoryId });
        // const hasProductOffer = products.some((product) => product.variants[0].offer > percentage);
        await Category.updateOne({ _id: categoryId }, { $set: { maxOffer: offerValue } });
        return res.status(HttpStatus.OK).json({ success: true, message: "Produce offer updated Successfully." });
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server Error " });
    }
}



const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);
        if (!category) return res.status(HttpStatus.NOT_FOUND).json({ status: false, message: "Category not found." });
        await Category.updateOne({ _id: categoryId }, { $set: { maxOffer: 0 } });
        return res.status(HttpStatus.OK).json({ success: true, message: "Offer has been removed for the product" });
    } catch (error) {
        console.error("Error removing the category offer : ", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server error." });
    }
}



const listCategory = async (req, res) => {
    try {
        const { id, page = 1 } = req.query;
        if (!id) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Category not found!" });
        await Category.updateOne({ _id: id }, { $set: { isListed: true } });
        return res.redirect(`/admin/category/?page=${page}`);
    } catch (error) {
        console.error("Error listing the product:", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, mesage: "Internal Server Error" });
    }
}



const unListCategory = async (req, res) => {
    try {
        const { id, page = 1 } = req.query;
        if (!id) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Category not found!" });
        await Category.updateOne({ _id: id }, { $set: { isListed: false } });
        return res.redirect(`/admin/category/?page=${page}`);
    } catch (error) {
        console.error("Error listing the product:", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, mesage: "Internal Server Error" });
    }
}



const loadEditCategory = async (req, res) => {
    try {
        const id = req.query.id;
        const category = await Category.findOne({ _id: id });
        res.render("editCategory", { category: category });
    } catch (error) {
        console.error("Error editing the category: ", error);
        return res.redirect('/pageNotFound')
    }
}



const editCategory = async (req, res) => {
    try {
        const id = req.query.id;
        const { name, description, isComponent, isPeripheral } = req.body;
        const existingCategory = await Category.findOne({ name: name });
        if (existingCategory.id !== id) {
            return res.json({ success: false, message: "Category exists, please choose another name" });
        }

        const updateCategory = await Category.findByIdAndUpdate(id, { $set: { name: name, description: description, isComponent: isComponent, isPeripheral: isPeripheral } });
        if (updateCategory) {
            res.status(200).json({ success: true, message: "Category updated successfully", redirectUrl: "/admin/category" });

        } else {
            res.status(400).json({ error: "Category not found" });
        }
    } catch (error) {
        console.error('Error editing category:', error);
        res.status(500).json({ error: "Internal server error" });
    }
}

//export functions 
export default { categoryInfo, addCategory, loadAddCategory, addCategoryOffer, removeCategoryOffer, listCategory, unListCategory, loadEditCategory, editCategory };