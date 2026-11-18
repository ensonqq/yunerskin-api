const httpStatus = require('http-status');
const { Gift, Cart } = require('../models');
const ApiError = require('../utils/ApiError');
/**
 * Create a gift
 * @param {Object} giftBody
 * @returns {Promise<Gift>}
 */
const createGift = async (giftBody) => {
  return Gift.create(giftBody);
};

/**
 * Query for gifts
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryGifts = async (filter, options) => {
  return await Gift.paginate(filter, options);
};

/**
 * Get gift by id
 * @param {ObjectId} id
 * @returns {Promise<Gift>}
 */
const getGiftById = async (id) => {
  return Gift.findById(id).populate('images');
};

/**
 * Get active gift
 * @returns {Promise<Gift>}
 */
const getActiveGift = async () => {
  return Gift.findOne({ active : true }).populate('images');
};

/**
 * Update gift by id
 * @param {ObjectId} giftId
 * @param {Object} updateBody
 * @returns {Promise<Gift>}
 */
const updateGiftById = async (giftId, updateBody) => {
  const gift = await getGiftById(giftId);
  if (!gift) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Gift not found');
  }

  Object.assign(gift, updateBody);
  await gift.save();
  return gift;
};

/**
 * Delete gift by id
 * @param {ObjectId} giftId
 * @returns {Promise<Gift>}
 */
const deleteGiftById = async (giftId) => {
  const gift = await getGiftById(giftId);
  if (!gift) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Gift not found');
  }
  await gift.remove();
  return gift;
};

module.exports = {
  createGift,
  queryGifts,
  getGiftById,
  updateGiftById,
  deleteGiftById,
  getActiveGift,
};
