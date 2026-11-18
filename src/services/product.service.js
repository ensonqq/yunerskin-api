const httpStatus = require('http-status');
const { Product } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a product
 * @param {Object} productBody
 * @returns {Promise<Product>}
 */
const createProduct = async (productBody) => {
  return Product.create(productBody);
};

/**
 * Query for products
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryProducts = async (filter, options) => {
  const products = await Product.paginate(filter, options);
  return products;
};

/**
 * Get product by id
 * @param {ObjectId} id
 * @returns {Promise<Product>}
 */
const getProductById = async (id) => {
  return Product.findById(id)
                .populate([{ path : 'images' }, { path : 'bundleItems', populate : { path : 'product', populate : { path : 'images' } } }]);
};

/**
 * Get product by name
 * @param {String} productName
 * @returns {Promise<Product>}
 */
const getProductByName = async (productName) => {
  const product = await Product.findOne({ $or : [{ 'name.zh' : productName }, { 'name.en' : productName }] }).populate('images category');
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  return product;
};

/**
 * Map cart items for non-member
 * @param {Array} items
 * @returns {Promise<Product>}
 */
const mapCartItems = async (items) => {
  const itemIds = items.map(item => {
    return item.product
  })

  //TODO, addons handling
  const products = await Product.find({ _id : { $in : itemIds } }).populate('images')
  const result = []
  for (let i in items) {
    const item = items[i]
    const product = products.filter(product => {
      return product.id === item.product
    })[0]
    result.push({ ...item, product })
  }
  return { items : result }
};

/**
 * Update product by id
 * @param {ObjectId} productId
 * @param {Object} updateBody
 * @returns {Promise<Product>}
 */
const updateProductById = async (productId, updateBody) => {
  const product = await getProductById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  Object.assign(product, updateBody);
  await product.save();
  return product;
};

/**
 * Delete product by id
 * @param {ObjectId} productId
 * @returns {Promise<Product>}
 */
const deleteProductById = async (productId) => {
  const product = await getProductById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  await product.remove();
  return product;
};

/**
 * bulk update by product ids
 * @param {Array} productIds
 * @param {Object} body
 * @returns {Promise[Product]}
 */
const bulkUpdateByProductIds = async (productIds, body) => {
  return Product.updateMany({ _id : { $in : productIds } }, { $set : { ...body } }, { multi : true, new : true })
};

module.exports = {
  createProduct,
  queryProducts,
  getProductById,
  updateProductById,
  deleteProductById,
  getProductByName,
  mapCartItems,
  bulkUpdateByProductIds
};
