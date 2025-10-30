function getSortOption(sort) {
  switch (sort) {
    case "newest": return { createdAt: -1 };
    case "oldest": return { createdAt: 1 };
    case "priceAsc": return { "variants.offer": 1 };
    case "priceDesc": return { "variants.offer": -1 };
    case "nameAsc": return { model: 1 };
    case "nameDesc": return { model: -1 };
    default: return {};
  }
}

export default getSortOption;
