export function applyFinalOfferToVariant(variant, category) {
    const price = variant.price;
    const variantOffer = variant.offer;
    if (!category?.maxOffer || category.maxOffer === 0) return Math.ceil(variantOffer);
    const categoryOfferPrice = price - (price * category.maxOffer / 100);
    const finalOffer = Math.min(variantOffer, categoryOfferPrice);
    return Math.ceil(finalOffer);
}
