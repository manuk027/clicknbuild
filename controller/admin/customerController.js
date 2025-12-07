//importing necessary modules and functions
import User from "../../models/userSchema.js";
import brandSortOption from "../../helpers/brandSort.js"
import { HttpStatus } from '../../helpers/statusCodes.js';


//function to load cutomer details in admin side
export const customerInfo = async (req, res, next) => {
  try {
    const searchTerm = req.query.search?.trim() || "";
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const sort = req.query.sort || "newest";
    const limit = 10;
    const query = { isAdmin: false };
    if (searchTerm) query.$or = [{ fullName: { $regex: searchTerm, $options: "i" } }, { email: { $regex: searchTerm, $options: "i" } },];
    const sortOption = brandSortOption(sort);
    const totalCustomers = await User.countDocuments(query);
    const customers = await User.find(query).sort(sortOption).skip((page - 1) * limit).limit(limit);
    const totalPages = Math.max(1, Math.ceil(totalCustomers / limit));
    res.render("customers", { customers, data: customers, current: page, pages: totalPages, search: searchTerm, sort });
  } catch (error) {
    console.error("Error loading customers:", error);
    next(error);
  }
};



//function to block customer in admin side
export const blockCustomer = async (req, res) => {
  try {
    const id = req.query.id;
    const page = req.query.page || 1;
    await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
    return res.redirect(`/admin/customers/?page=${page}`);
  } catch (error) {
    console.error("Error blocking the user:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error while blocking the user." });
  }
};



//function to unblock cutomer in admin side
export const unblockCustomer = async (req, res) => {
  try {
    const id = req.query.id;
    const page = req.query.page || 1;
    await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
    return res.redirect(`/admin/customers/?page=${page}`);
  } catch (error) {
    console.error("Error unblocking the user:", error);
    return res.status(500).json({ success: false, message: "Internal server error while unblocking the user." });
  }
};



//exporting functions
export default { customerInfo, blockCustomer, unblockCustomer };