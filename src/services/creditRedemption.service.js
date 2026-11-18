const httpStatus = require('http-status')
const { CreditRedemption, CreditRedemptionLog, User } = require('../models')
const ApiError = require('../utils/ApiError')
const config = require('../config/config')
/**
 * Create a creditRedemption
 * @param {Object} creditRedemptionBody
 * @returns {Promise<CreditRedemption>}
 */
const createCreditRedemption = async (creditRedemptionBody) => {
  return CreditRedemption.create(creditRedemptionBody)
}

/**
 * Create a credit redemption order
 * @param {Object} logBody
 * @returns {Promise<CreditRedemptionLog>}
 */
const createCreditRedemptionLog = async (logBody) => {
  return CreditRedemptionLog.create(logBody)
}

/**
 * Query for categories
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryCreditRedemptions = async (filter, options) => {
  return await CreditRedemption.paginate(filter, options)
}

/**
 * Get creditRedemption by id
 * @param {ObjectId} id
 * @returns {Promise<CreditRedemption>}
 */
const getCreditRedemptionById = async (id) => {
  return CreditRedemption.findById(id).populate('images')
}


/**
 * Update creditRedemption by id
 * @param {ObjectId} creditRedemptionId
 * @param {Object} updateBody
 * @returns {Promise<CreditRedemption>}
 */
const updateCreditRedemptionById = async (creditRedemptionId, updateBody) => {
  const creditRedemption = await getCreditRedemptionById(creditRedemptionId)
  if (!creditRedemption) {
    throw new ApiError(httpStatus.NOT_FOUND, '積分領取不存在或已失效。')
  }

  Object.assign(creditRedemption, updateBody)
  await creditRedemption.save()
  return creditRedemption
}
/**
 * Update creditRedemption by unique id
 * @param {ObjectId} creditRedemptionUniqueId
 * @param {ObjectId} userId
 * @returns {Promise<CreditRedemption>}
 */
const getCreditRedemptionAvailabilityByUniqueId = async (creditRedemptionUniqueId, userId) => {
  const creditRedemption = await CreditRedemption.findOne({ uniqueId : creditRedemptionUniqueId, publish : true })
  // if exists
  if (!creditRedemption) {
    throw new ApiError(httpStatus.NOT_FOUND, '積分領取不存在。')
  }

  // if reached redemption
  if (creditRedemption.redeemQty >= creditRedemption.maxRedeemQty) {
    throw new ApiError(httpStatus.NOT_FOUND, '積分已經搶空了。')
  }

  // if user is redeemed
  const userRecord = await CreditRedemptionLog.findOne({ creditRedemptionRef : creditRedemption.id, redeemedBy : userId })
  if (userRecord) {
    throw new ApiError(httpStatus.NOT_FOUND, '你已領取過了。')
  }

  return creditRedemption
}

/**
 * Update creditRedemption by unique id
 * @param {ObjectId} creditRedemptionUniqueId
 * @param {ObjectId} userId
 * @returns {Promise<CreditRedemption>}
 */
const createRedemption = async (creditRedemptionUniqueId, userId) => {
  if (!config.features.creditsEnabled) {
    throw new ApiError(httpStatus.FORBIDDEN, '積分功能暫停開放。')
  }

  const creditRedemption = await getCreditRedemptionAvailabilityByUniqueId(creditRedemptionUniqueId, userId)

  // redeem + 1
  await CreditRedemption.findByIdAndUpdate(creditRedemption.id, { $inc : { redeemQty : 1 } })
  await User.findByIdAndUpdate(userId, { $inc : { credits : creditRedemption.credits } })
  return CreditRedemptionLog.create({
    redeemedBy          : userId,
    credits             : creditRedemption.credits,
    creditRedemptionRef : creditRedemption.id
  })
}

/**
 * Delete creditRedemption by id
 * @param {ObjectId} creditRedemptionId
 * @returns {Promise<CreditRedemption>}
 */
const deleteCreditRedemptionById = async (creditRedemptionId) => {
  const creditRedemption = await getCreditRedemptionById(creditRedemptionId)
  if (!creditRedemption) {
    throw new ApiError(httpStatus.NOT_FOUND, '積分領取不存在或已失效。')
  }
  await creditRedemption.remove()
  return creditRedemption
}

/**
 * Query for creditRedemption orders
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryCreditRedemptionLogs = async (filter, options) => {
  return CreditRedemptionLog.paginate(filter, options);
};


module.exports = {
  createCreditRedemption,
  queryCreditRedemptions,
  getCreditRedemptionById,
  updateCreditRedemptionById,
  deleteCreditRedemptionById,
  createCreditRedemptionLog,
  queryCreditRedemptionLogs,
  getCreditRedemptionAvailabilityByUniqueId,
  createRedemption
}
