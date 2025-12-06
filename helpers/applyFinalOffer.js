export function applyFinalOffer(product, category) {
    if (!product?.variants?.length) return product;

    const variant = product.variants[0];
    const price = variant.price;
    const variantOffer = variant.offer;
    if (!category?.maxOffer || category.maxOffer === 0) {
        variant.offer = Math.ceil(variantOffer);
        return product;
    }
    const categoryOfferPrice = price - (price * category.maxOffer / 100);
    const finalOffer = Math.min(variantOffer, categoryOfferPrice);
    variant.offer = Math.ceil(finalOffer);
    return product;
}

