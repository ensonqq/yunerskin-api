const httpStatus = require('http-status');
const { KeyAccount, Product } = require('../models');
const ApiError = require('../utils/ApiError');
/**
 * Create a keyAccount
 * @param {Object} keyAccountBody
 * @returns {Promise<KeyAccount>}
 */
const createKeyAccount = async (keyAccountBody) => {
  return KeyAccount.create(keyAccountBody);
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
const queryKeyAccounts = async (filter, options) => {
  return await KeyAccount.paginate(filter, options);
};

/**
 * Get keyAccount by id
 * @param {ObjectId} id
 * @returns {Promise<KeyAccount>}
 */
const getKeyAccountById = async (id) => {
  return KeyAccount.findById(id).populate('images');
};

/**
 * Query for keyAccount products
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const getKeyAccountProducts = async (filter, options) => {
  return Product.paginate(filter, options);
};

/**
 * Update keyAccount by id
 * @param {ObjectId} keyAccountId
 * @param {Object} updateBody
 * @returns {Promise<KeyAccount>}
 */
const updateKeyAccountById = async (keyAccountId, updateBody) => {
  const keyAccount = await getKeyAccountById(keyAccountId);
  if (!keyAccount) {
    throw new ApiError(httpStatus.NOT_FOUND, 'KeyAccount not found');
  }

  Object.assign(keyAccount, updateBody);
  await keyAccount.save();
  return keyAccount;
};

/**
 * Delete keyAccount by id
 * @param {ObjectId} keyAccountId
 * @returns {Promise<KeyAccount>}
 */
const deleteKeyAccountById = async (keyAccountId) => {
  const keyAccount = await getKeyAccountById(keyAccountId);
  if (!keyAccount) {
    throw new ApiError(httpStatus.NOT_FOUND, 'KeyAccount not found');
  }
  await keyAccount.remove();
  return keyAccount;
};

module.exports = {
  createKeyAccount,
  queryKeyAccounts,
  getKeyAccountById,
  updateKeyAccountById,
  deleteKeyAccountById,
  getKeyAccountProducts
};
