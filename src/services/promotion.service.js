const httpStatus = require('http-status');
const { Promotion, Product } = require('../models');
const ApiError = require('../utils/ApiError');
/**
 * Create a promotion
 * @param {Object} promotionBody
 * @returns {Promise<Promotion>}
 */
const createPromotion = async (promotionBody) => {
  return Promotion.create(promotionBody);
};

/**
 * Query for categories
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryPromotions = async (filter, options) => {
  return await Promotion.paginate(filter, options);
};

/**
 * Get promotion by id
 * @param {ObjectId} id
 * @returns {Promise<Promotion>}
 */
const getPromotionById = async (id) => {
  return Promotion.findById(id).populate('images');
};

/**
 * Get active promotion
 * @returns {Promise<Promotion>}
 */
const getActivePromotion = async () => {
  return Promotion.findOne({ active : true }).populate('images');
};

/**
 * Query for promotion products
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const getPromotionProducts = async (filter, options) => {
  return Product.paginate(filter, options);
};

/**
 * Update promotion by id
 * @param {ObjectId} promotionId
 * @param {Object} updateBody
 * @returns {Promise<Promotion>}
 */
const updatePromotionById = async (promotionId, updateBody) => {
  const promotion = await getPromotionById(promotionId);
  if (!promotion) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promotion not found');
  }

  Object.assign(promotion, updateBody);
  await promotion.save();
  return promotion;
};

/**
 * Delete promotion by id
 * @param {ObjectId} promotionId
 * @returns {Promise<Promotion>}
 */
const deletePromotionById = async (promotionId) => {
  const promotion = await getPromotionById(promotionId);
  if (!promotion) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promotion not found');
  }
  await promotion.remove();
  return promotion;
};

module.exports = {
  createPromotion,
  queryPromotions,
  getPromotionById,
  updatePromotionById,
  deletePromotionById,
  getPromotionProducts,
  getActivePromotion
};
