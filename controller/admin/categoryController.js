import Category from "../../models/categorySchema.js";

const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        const categoryData = Category.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);
        res.render('category', { cat: categoryData, currentPage: page, totalPages: totalPages, totalCategories: totalCategories, });
    } catch (error) {
        console.error("Error loding category: ", error);
        return res.redirect('/pageNotFound');
    }
}

const addCategory = async (req, res) => {
    try {
        const {name, description} = req.body;
        const existingCategory = await Category.findOne({name});
        if(existingCategory){
            return res.status(400).json({Error: "Category already exists"})
        }
        const newCategory = new Category({name, description});
        await newCategory.save();
        return res.json({message: "Category addeed successfully"})
    } catch (error) {
        console.log("Error adding new category: ", error);
        return res.redirect('/pageNotFound');
    }
};


export default { categoryInfo, addCategory };