import Coupon from "../../models/couponSchema.js";
import couponSortOption from "../../helpers/couponSort.js"
import User from '../../models/userSchema.js';
import CouponUsage from '../../models/couponUsage.js';



export const loadCouponsService = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const sort = req.query.sort || "name";
        const sortOption = couponSortOption(sort);
        const limit = 10;
        const skip = (page - 1) * limit;
        const searchTerm = req.query.search ? req.query.search.trim() : "";
        const searchQuery = searchTerm ? { name: { $regex: searchTerm, $options: "i" } } : {};
        // const searchQuery = searchTerm ? { ...baseFilter, name: { $regex: searchTerm, $options: "i" } } : baseFilter;
        const couponData = await Coupon.find(searchQuery).sort(sortOption).skip(skip).limit(limit);
        const totalCoupons = await Coupon.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalCoupons / limit);
        res.render("coupons", { coupon: couponData, data: couponData, current: page, pages: totalPages, totalCoupons, limit, sort, search: searchTerm });
    } catch (error) {
        console.error('Error loading th coupons: ', error);
        return res.redirect("/admin/pageNotFound");

    }
};



export const unListCouponsService = async (req, res) => {
    try {
        let id = req.query.id;
        const page = req.query.page || 1;
        await Coupon.updateOne({ _id: id }, { $set: { isListed: false } });
        res.redirect(`/admin/coupons/?page=${page}`);
    } catch (error) {
        console.error("Error unlisting the coupon:", error);
        return res.redirect('/pageNotFound');
    }
}



export const listCouponsService = async (req, res) => {
    try {
        let id = req.query.id;
        const page = req.query.page || 1;
        await Coupon.updateOne({ _id: id }, { $set: { isListed: true } });
        res.redirect(`/admin/coupons/?page=${page}`);
    } catch (error) {
        console.error("Error listing the coupon:", error);
        return res.redirect('/pageNotFound');
    }
}



export const loadAddCouponsService = async (req, res) => {
    try {
        res.render('addCoupon');
    } catch (error) {
        console.error("Error loading add coupon page: ", error);
        return res.redirect('/admin/pageNotFound');
    }
}



export const addCouponsService = async (req, res) => {
    try {
        const { couponName, couponCode, discount, minPurchase, status } = req.body;
        const newCoupon = new Coupon({
            name: couponName,
            code: couponCode,
            minimumPurchase: Number(minPurchase),
            discount: Number(discount),
            isListed: status === "listed",
        })
        await newCoupon.save();
        const allUsers = await User.find({});
        const usageEntries = allUsers.map(u => ({
            userId: u._id,
            couponId: newCoupon._id,
            used: false
        }));
        await CouponUsage.insertMany(usageEntries, { ordered: false }).catch(() => { });
        return res.redirect('/admin/coupons');
    } catch (error) {
        console.error('Error adding the product : ', error);
        return res.redirect('/admin/pageNotFound');
    }
}








