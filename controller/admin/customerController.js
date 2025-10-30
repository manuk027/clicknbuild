//importing necessary modules and functions
import User from "../../models/userSchema.js";
import brandSortOption from "../../helpers/brandSort.js"



//function to load cutomer details in admin side
const customerInfo = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort;
    const sortOption = brandSortOption(sort);
    const limit = 10;
    const query = { isAdmin: false };
    if (search) {
      query.$or = [{ fullName: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
    }
    const count = await User.countDocuments(query);
    const userData = await User.find(query).sort(sortOption).limit(limit).skip((page - 1) * limit);
    const totalPages = Math.max(1, Math.ceil(count / limit));
    res.render("customers", { data: userData, customers: userData, current: page, pages: totalPages, search, sort });
  } catch (error) {
    console.error("Error loading customers:", error);
    res.redirect("/pageNotFound");
  }
};



//function to block customer in admin side
const blockCustomer = async (req, res) => {
  try {
    let id = req.query.id;
    const page = req.query.page || 1;
    await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
    return res.redirect(`/admin/customers/?page=${page}`);
  } catch (error) {
    console.error("Error blocking the user: ", error);
    res.redirect('/pageNotFound');
  }
};



//function to unblock cutomer in admin side
const unblockCustomer = async (req, res) => {
  try {
    let id = req.query.id;
    const page = req.query.page || 1;
    await User.updateMany({ _id: id }, { $set: { isBlocked: false } });
    return res.redirect(`/admin/customers/?page=${page}`);
  } catch (error) {
    console.error("Error unblocking the user: ", error);
    res.redirect('/pageNotFound');
  }
};


//exporting functions
export default { customerInfo, blockCustomer, unblockCustomer };