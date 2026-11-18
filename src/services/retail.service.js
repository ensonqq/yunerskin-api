const httpStatus = require('http-status');
const { Retail, Product } = require('../models');
const ApiError = require('../utils/ApiError');
/**
 * Create a retail
 * @param {Object} retailBody
 * @returns {Promise<Retail>}
 */
const createRetail = async (retailBody) => {
  return Retail.create(retailBody);
};

/**
 * Query for retails
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryRetails = async (filter, options) => {
  return await Retail.paginate(filter, options);
};

/**
 * Get retail by id
 * @param {ObjectId} id
 * @returns {Promise<Retail>}
 */
const getRetailById = async (id) => {
  return Retail.findById(id).populate('images');
};

/**
 * Get active retail
 * @returns {Promise<Retail>}
 */
const getActiveRetail = async () => {
  return Retail.findOne({ active : true }).populate('images');
};

/**
 * Query for retail products
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const getRetailProducts = async (filter, options) => {
  return Product.paginate(filter, options);
};

/**
 * Update retail by id
 * @param {ObjectId} retailId
 * @param {Object} updateBody
 * @returns {Promise<Retail>}
 */
const updateRetailById = async (retailId, updateBody) => {
  const retail = await getRetailById(retailId);
  if (!retail) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Retail not found');
  }

  Object.assign(retail, updateBody);
  await retail.save();
  return retail;
};

/**
 * Delete retail by id
 * @param {ObjectId} retailId
 * @returns {Promise<Retail>}
 */
const deleteRetailById = async (retailId) => {
  const retail = await getRetailById(retailId);
  if (!retail) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Retail not found');
  }
  await retail.remove();
  return retail;
};

module.exports = {
  createRetail,
  queryRetails,
  getRetailById,
  updateRetailById,
  deleteRetailById,
  getRetailProducts,
  getActiveRetail
};
