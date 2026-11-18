const httpStatus = require('http-status');
const { Category, Product } = require('../models');
const MenuOrder = require('../models/menuOrder.model');
const ApiError = require('../utils/ApiError');

/**
 * Generate a URL-safe slug from a string, ensuring it is unique in the DB.
 * e.g. "BBQ Chicken" -> "bbq-chicken", or "bbq-chicken-2" on collision.
 * @param {string} text
 * @returns {Promise<string>}
 */
const generateUniqueSlug = async (text) => {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')  // non-alphanumeric (allow CJK) -> hyphen
    .replace(/^-+|-+$/g, '');                    // trim leading/trailing hyphens

  let slug = base;
  let counter = 2;
  while (await Category.findOne({ slug })) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
};

/**
 * Create a category
 * @param {Object} categoryBody
 * @returns {Promise<Category>}
 */
const createCategory = async (categoryBody) => {
  if (!categoryBody.slug) {
    categoryBody.slug = await generateUniqueSlug(categoryBody.name.en);
  }

  const category = await Category.create(categoryBody);

  // Auto-append to MenuOrder as an ungrouped or grouped entry
  // Only add to MenuOrder if ungrouped (group === null/undefined)
  // Grouped categories appear under their group entry in MenuOrder
  if (!category.group) {
    const menuOrder = await MenuOrder.getSingleton();
    menuOrder.items.push({ type : 'category', refId : category._id });
    await menuOrder.save();
  }

  return category;
};


/**
 * Query for categories
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryCategories = async (filter, options) => {
  return await Category.paginate(filter, options);
};

/**
 * Get category by id
 * @param {ObjectId} id
 * @returns {Promise<Category>}
 */
const getCategoryById = async (id) => {
  return Category.findById(id).populate('images group');
};

/**
 * Get category by slug, with published & non-archived products populated.
 * Used by the public-facing storefront.
 * @param {string} slug
 * @returns {Promise<Category>}
 */
const getCategoryBySlug = async (slug) => {
  return Category.findOne({ slug }).populate([
    { path : 'images' },
    { path : 'group' },
    {
      path     : 'products',
      match    : { publish : true, archive : false },
      populate : { path : 'images' },
    },
  ]);
};

/**
 * Query for category products
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getCategoryProducts = async (filter, options) => {
  return Product.paginate(filter, options);
};

/**
 * Update category by id
 * @param {ObjectId} categoryId
 * @param {Object} updateBody
 * @returns {Promise<Category>}
 */
const updateCategoryById = async (categoryId, updateBody) => {
  const category = await getCategoryById(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }

  Object.assign(category, updateBody);
  await category.save();
  return category;
};

/**
 * Delete category by id — also removes it from MenuOrder
 * @param {ObjectId} categoryId
 * @returns {Promise<Category>}
 */
const deleteCategoryById = async (categoryId) => {
  const category = await getCategoryById(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }

  // Remove from MenuOrder
  const menuOrder = await MenuOrder.getSingleton();
  menuOrder.items = menuOrder.items.filter(
    (item) => item.refId.toString() !== categoryId.toString()
  );
  await menuOrder.save();

  await category.remove();
  return category;
};

module.exports = {
  createCategory,
  queryCategories,
  getCategoryById,
  getCategoryBySlug,
  updateCategoryById,
  deleteCategoryById,
  getCategoryProducts,
};
