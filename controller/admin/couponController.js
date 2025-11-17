import { loadCouponsService, unListCouponsService, listCouponsService, loadAddCouponsService, addCouponsService } from '../../services/admin/couponService.js';

export const loadCoupons = async (req, res) => {
    await loadCouponsService(req, res);
}

export const unListCoupons = async (req, res) => {
    await unListCouponsService(req, res);
}

export const listCoupons = async (req, res) => {
    await listCouponsService(req, res);
}

export const loadAddCoupons = async (req, res) => {
    await loadAddCouponsService(req, res);
}

export const addCoupons = async (req, res) => {
    await addCouponsService(req, res);
}

