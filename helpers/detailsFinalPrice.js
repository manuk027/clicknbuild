export function applyFinalOfferToAllVariants(product, category) {
    if (!product?.variants?.length) return product;
    product.variants = product.variants.map(variant => {
        const price = variant.price;
        const variantOffer = variant.offer;
        if (!category?.maxOffer || category.maxOffer === 0) {
            variant.offer = Math.ceil(variantOffer);
            return variant;
        }
        const categoryOfferPrice = price - (price * category.maxOffer / 100);
        const finalOffer = Math.min(variantOffer, categoryOfferPrice);
        variant.offer = Math.ceil(finalOffer);
        return variant;
    });
    return product;
}
