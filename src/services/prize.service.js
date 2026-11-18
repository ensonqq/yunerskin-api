const httpStatus = require('http-status');
const { Prize, PrizeRecord, Cart } = require('../models');
const ApiError = require('../utils/ApiError');
/**
 * Create a prize
 * @param {Object} prizeBody
 * @returns {Promise<Prize>}
 */
const createPrize = async (prizeBody) => {
  return Prize.create(prizeBody);
};

/**
 * Query for prizes
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryPrizes = async (filter, options) => {
  return await Prize.paginate(filter, options);
};

/**
 * Query for prize records
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryPrizeRecords = async (filter, options) => {
  return await PrizeRecord.paginate(filter, options);
};

/**
 * Get prize by id
 * @param {ObjectId} id
 * @returns {Promise<Prize>}
 */
const getPrizeById = async (id) => {
  return Prize.findById(id).populate('images');
};

/**
 * Get prize record by id
 * @param {ObjectId} id
 * @returns {Promise<Prize>}
 */
const getPrizeRecordById = async (id) => {
  return PrizeRecord.findById(id);
};

/**
 * Get active prize
 * @returns {Promise<Prize>}
 */
const getActivePrize = async () => {
  return Prize.findOne({ active : true }).populate('images');
};

/**
 * Update prize by id
 * @param {ObjectId} prizeId
 * @param {Object} updateBody
 * @returns {Promise<Prize>}
 */
const updatePrizeById = async (prizeId, updateBody) => {
  const prize = await getPrizeById(prizeId);
  if (!prize) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Prize not found');
  }

  Object.assign(prize, updateBody);
  await prize.save();
  return prize;
};

/**
 * Update my prize
 * @param {ObjectId} createdBy
 * @param {Object} data
 * @returns {Promise<Prize>}
 */
const updateMyPrize = async (createdBy, data) => {
  return PrizeRecord.findOneAndUpdate({ createdBy }, data, { upsert : true, new : true })
                    .populate({ path : 'item.product', populate : { path : 'images' } })
}

/**
 * Get my prize
 * @param {ObjectId} createdBy
 * @returns {Promise<Prize>}
 */
const getMyPrice = async (createdBy) => {
  return PrizeRecord.findOne({ createdBy }).populate([{ path : 'item.product', populate : 'images' }]);
};

/**
 * Delete prize by id
 * @param {ObjectId} prizeId
 * @returns {Promise<Prize>}
 */
const deletePrizeById = async (prizeId) => {
  const prize = await getPrizeById(prizeId);
  if (!prize) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Prize not found');
  }
  await prize.remove();
  return prize;
};

/**
 * Delete prize record by id
 * @param {ObjectId} prizeRecordId
 * @returns {Promise<Prize>}
 */
const deletePrizeRecordById = async (prizeRecordId) => {
  const prizeRecord = await getPrizeRecordById(prizeRecordId);
  if (!prizeRecord) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Prize not found');
  }
  await prizeRecord.remove();
  return prizeRecord;
};

/**
 * Delete prize record by id
 * @param {ObjectId} prizeRecordId
 * @returns {Promise<Prize>}
 */
const deleteAllPrizeRecord = async () => {
  const result = await PrizeRecord.deleteMany({});
  if (!result) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, '出問題了！');
  }
  // await result.remove();
  return result;
};


module.exports = {
  createPrize,
  queryPrizes,
  getPrizeById,
  updatePrizeById,
  deletePrizeById,
  getActivePrize,
  updateMyPrize,
  getMyPrice,
  queryPrizeRecords,
  deletePrizeRecordById,
  deleteAllPrizeRecord
};
