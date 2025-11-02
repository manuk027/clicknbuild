import Product from "../models/productSchema.js";

const updateProduct = async (productId, productData) => {
  // Find product by ID
  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");

  // Destructure the incoming data
  const {
    brand, productName, description, category,
    status = "listed", categoryType = "component",
    limitedEdition = false, flashSale = false,
    variants = [], specifications = [], images = []
  } = productData;

  // Basic validations (can also move to controller)
  if (!brand || !productName || !category)
    throw new Error("Missing required fields");
  if (!images.length)
    throw new Error("Please upload at least one image");

  // Boolean conversions
  const isListed = status === "listed";
  const isComponent = categoryType === "component";
  const isPeripheral = categoryType === "peripheral";
  const isLimited = limitedEdition === true || limitedEdition === "true";
  const onFlashSale = flashSale === true || flashSale === "true";

  // Validate and map variants
  const validVariants = variants.filter(v => v.variant && v.price && v.quantity)
    .map(v => ({
      variant: v.variant,
      quantity: Number(v.quantity),
      price: Number(v.price),
      offer: Number(v.offer || 0),
    }));

  if (validVariants.length === 0)
    throw new Error("Please add at least one valid variant");

  // Validate and map specs
  const validSpecs = specifications.filter(s => s.title && s.details)
    .map(s => ({ title: s.title, details: s.details }));

  // Update fields
  product.brand = brand;
  product.model = productName;
  product.description = description;
  product.isListed = isListed;
  product.isComponent = isComponent;
  product.isPeripheral = isPeripheral;
  product.isLimited = isLimited;
  product.onFlashSale = onFlashSale;
  product.category = category;
  product.variants = validVariants;
  product.specification = validSpecs;
  product.images = images;

  // Save the updated product
  await product.save();

  return product;
};

export default {
  updateProduct,
};
