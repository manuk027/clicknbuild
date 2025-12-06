import Product from "../models/productSchema.js";

export const getVariantNameById = async (variantId) => {
    const product = await Product.findOne(
        { "variants._id": variantId },
        { "variants.$": 1 }
    ).lean();
    if (!product || !product.variants || product.variants.length === 0) {
        return null;
    }
    return product.variants[0].variant;
};
