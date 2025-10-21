//importing necessary modules and functions
import Category from "../../models/categorySchema.js";
import Product from "../../models/productSchema.js";


//function to load category information in admin side
const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        const categoryData = await Category.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);
        res.render('category', { category: categoryData, data: categoryData, current: page, pages: totalPages, totalCategories: totalCategories, limit: limit });
    } catch (error) {
        console.error("Error loding category: ", error);
        return res.redirect('/pageNotFound');
    }
}


//function to add category in admin side
const addCategory = async (req, res) => {
    const { name, description, maxOffer } = req.body;
    console.log(req.body)
    if (!name || !description) {
        return res.status(400).json({ success: false, message: "Name and description are required" });
    }
    if (maxOffer && (isNaN(maxOffer) || maxOffer < 0 || maxOffer > 100)) {
        return res.status(400).json({ success: false, message: "Offer must be a number between 0 and 100" });
    }

    try {
        // case-insensitive check
        const categoryExist = await Category.findOne({ name: name });
        if (categoryExist) {
            return res.json({ success: false, message: "Category already exists" });
        }

        const newCategory = new Category({ name, description, maxOffer });
        await newCategory.save();

        return res.json({
            success: true,
            message: "Category added successfully",
            redirectUrl: "/admin/category/add"
        });
    } catch (error) {
        console.error("Error adding category:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};



const loadAddCategory = async (req, res) => {
    try {
        res.render('addCategory');
    } catch (error) {
        console.error('Error loading category add page', error);
    }
}

/* 
    Funciton to delete the category
    Route: DELETE /admin/category/:id
*/
const deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        await Category.findByIdAndDelete(id);
        return res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
        console.error("Error deleting category:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}

const addCategoryOffer = async (req, res) => {
    try {
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }
        const products = await Product.find({ category: categoryId });
        const hasProductOffer = products.some((product) => product.variants[0].offer > percentage);
        await Category.updateOne({ _id: categoryId }, { $set: { maxOffer: percentage } });
        res.json({ status: true });
    } catch (error) {
        res.status(500).json({ status: false, message: "Internal server Error " });
    }
}

const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }
        await Category.updateOne({ _id: categoryId }, { $set: { maxOffer: 0 } });
        res.json({ status: true });
    } catch (error) {
        res.status(500).json({ status: false, message: "Internal server Error " });
    }
}

const listCategory = async(req, res)=>{
    try {
        let id = req.query.id;
        await Category.updateOne({_id: id}, {$set: {isListed: true}});
        res.redirect('/admin/category');
    } catch (error) {
        console.log("Error listing the product:", error);
        return res.redirect('/pageNotFound');
    }
}

const unListCategory = async (req, res)=> {
     try {
        let id = req.query.id;
        await Category.updateOne({_id: id}, {$set: {isListed: false}});
        res.redirect('/admin/category');
    } catch (error) {
        console.log("Error listing the product:", error);
        return res.redirect('/pageNotFound');
    }
}

//export functions 
export default { categoryInfo, addCategory, loadAddCategory, deleteCategory, addCategoryOffer, removeCategoryOffer, listCategory, unListCategory };