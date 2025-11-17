import crypto from "crypto";

export const generateCouponCode = () => {
    return "CPN-" + crypto.randomBytes(3).toString("hex").toUpperCase();
};
