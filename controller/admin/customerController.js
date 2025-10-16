import User from "../../models/userSchema.js";

const customerInfo = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const query = {
      isAdmin: false,
      $or: [
        { fullName: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } }
      ]
    };

    const count = await User.countDocuments(query);
    const userData = await User.find(query)
      .limit(limit)
      .skip((page - 1) * limit);

    const totalPages = Math.max(1, Math.ceil(count / limit));

    res.render('customers', {
      data: userData,
      limit,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error(error);
    res.redirect('/pageNotFound');
  }
};


const blockCustomer = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateMany({ _id: id }, { $set: { isBlocked: true } });
        return res.redirect('/admin/customers');
    } catch (error) {
        console.error("Error blocking the user: ".error);
        res.redirect('/pageNotFound');
    }
};

const unblockCustomer = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateMany({ _id: id }, { $set: { isBlocked: false } });
        return res.redirect('/admin/customers');
    } catch (error) {
        console.error("Error unblocking the user: ", error);
        res.redirect('/pageNotFound');
    }
};


export default { customerInfo, blockCustomer, unblockCustomer };