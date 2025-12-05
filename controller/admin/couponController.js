import { HttpStatusCode } from 'axios';
import { loadCouponsService, unListCouponsService, listCouponsService, addCouponsService } from '../../services/admin/couponService.js';
import { HttpStatus } from '../../helpers/statusCodes.js';

export const loadCoupons = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const sort = req.query.sort || "newest";
        const searchTerm = req.query.search || "";
        const { couponData, totalCoupons, totalPages, limit } = await loadCouponsService(page, sort, searchTerm);
        res.render("coupons", { coupon: couponData, data: couponData, current: page, pages: totalPages, totalCoupons, limit, sort, search: searchTerm });
    } catch (error) {
        next(error);
    }
};



export const unListCoupons = async (req, res, next) => {
    try {
        const id = req.query.id;
        const page = req.query.page || 1;
        if (!id) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Coupon not found.", });
        await unListCouponsService(id);
        return res.redirect(`/admin/coupons/?page=${page}`);
    } catch (error) {
        next(error);
    }
};



export const listCoupons = async (req, res) => {
    try {
        const { id, page = 1 } = req.query;
        if (!id) return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Coupon not found." });
        await listCouponsService(id);
        return res.redirect(`/admin/coupons/?page=${page}`);
    } catch (error) {
        next(error);
    }
}



export const loadAddCoupons = async (req, res, next) => {
    try {
        return res.render("addCoupon");
    } catch (error) {
        next(error);
    }
};



export const addCoupons = async (req, res) => {
    try {
        const result = await addCouponsService(req.body);
        if (!result.success) return res.status(400).json({ success: false, message: result.message });
        return res.status(HttpStatus.OK).json({ success: true, message: "Coupon added successfully", redirect: "/admin/coupons" });
    } catch (error) {
        console.error("Error adding coupon:", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
    }
};


