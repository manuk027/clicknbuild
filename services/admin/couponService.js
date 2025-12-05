import Coupon from "../../models/couponSchema.js";
import couponSortOption from "../../helpers/couponSort.js"
import User from '../../models/userSchema.js';
import CouponUsage from '../../models/couponUsage.js';



export const loadCouponsService = async (page, sort, searchTerm) => {
    try {
        const sortOption = couponSortOption(sort);
        const limit = 10;
        const skip = (page - 1) * limit;
        const searchQuery = searchTerm ? { name: { $regex: searchTerm.trim(), $options: "i" } } : {};
        const couponData = await Coupon.find(searchQuery).sort(sortOption).skip(skip).limit(limit);
        const totalCoupons = await Coupon.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalCoupons / limit);
        return { couponData, totalCoupons, totalPages, limit };
    } catch (error) {
        throw error;
    }
};



export const unListCouponsService = async (id) => {
    try {
        return await Coupon.updateOne({ _id: id }, { $set: { isListed: false } });
    } catch (error) {
        throw error;
    }
};



export const listCouponsService = async (id) => {
    try {
        return await Coupon.updateOne({ _id: id }, { $set: { isListed: true } });
    } catch (error) {
        throw error;
    }
}



export const addCouponsService = async (couponData) => {
    const { couponName, couponCode, discount, minPurchase, status } = couponData;
    if (!couponName || couponName.trim() === "") return { success: false, message: "Coupon name cannot be blank." };
    if (!couponCode || couponCode.trim() === "") return { success: false, message: "Coupon code cannot be blank." };
    const numericDiscount = Number(discount);
    if (isNaN(numericDiscount) || numericDiscount < 1 || numericDiscount > 100) return { success: false, message: "Discount must be between 1 and 100." };
    const numericMinPurchase = Number(minPurchase);
    if (isNaN(numericMinPurchase) || numericMinPurchase <= 0) return { success: false, message: "Minimum purchase must be greater than 0." };
    const newCoupon = await Coupon.create({ name: couponName.trim(), code: couponCode.trim(), minimumPurchase: numericMinPurchase, discount: numericDiscount, isListed: status === "listed", });
    const allUsers = await User.find({}, "_id");
    const usageEntries = allUsers.map(user => ({ userId: user._id, couponId: newCoupon._id, used: false }));
    await CouponUsage.insertMany(usageEntries, { ordered: false }).catch(() => { });
    return { success: true, coupon: newCoupon };
};
