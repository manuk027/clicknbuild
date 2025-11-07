import Product from "../models/productSchema.js";

export const getVariantNameById = async (variantId) => {
    const product = await Product.findOne(
        { "variants._id": variantId },  
        { "variants.$": 1 }             
    );

    if (!product || !product.variants.length) {
        return null;
    }

    return product.variants[0].variant;
};