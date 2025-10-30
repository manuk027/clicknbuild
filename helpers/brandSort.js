function brandSortOption(sort) {
  switch (sort) {
    case "newest": return { createdAt: -1 };
    case "oldest": return { createdAt: 1 };
    default: return {createdAt: -1};
  }
}



export default brandSortOption;
