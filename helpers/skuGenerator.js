export const generateSKU = (brand, model, variant, category) => {
    const b = brand?.slice(0, 4)?.toUpperCase() || "GEN";
    const m = model?.replace(/\s+/g, "").slice(0, 4)?.toUpperCase() || "MOD";
    const v = variant?.replace(/\s+/g, "").slice(0, 4)?.toUpperCase() || "VAR";
    const c = category?.replace(/\s+/g, "").slice(0, 3)?.toUpperCase() || "CAT";
    return `${b}-${c}-${m}-${v}`;
};