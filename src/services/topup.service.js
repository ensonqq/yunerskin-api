const httpStatus = require('http-status')
const { Topup, TopupOrder, Order } = require('../models')
const ApiError = require('../utils/ApiError')
/**
 * Create a topup
 * @param {Object} topupBody
 * @returns {Promise<Topup>}
 */
const createTopup = async (topupBody) => {
  return Topup.create(topupBody)
}

/**
 * Create a top up order
 * @param {Object} orderBody
 * @returns {Promise<TopupOrder>}
 */
const createTopupOrder = async (orderBody) => {
  return TopupOrder.create(orderBody)
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
const queryTopups = async (filter, options) => {
  return await Topup.paginate(filter, options)
}

/**
 * Get topup by id
 * @param {ObjectId} id
 * @returns {Promise<Topup>}
 */
const getTopupById = async (id) => {
  return Topup.findById(id).populate('images')
}

/**
 * Get active topup
 * @returns {Promise<Topup>}
 */
const getActiveTopup = async () => {
  return Topup.findOne({ publish : true }).populate('images')
}

/**
 * Get Topup Orders Count of user of specific topup card
 * @returns {Promise<TopupOrder>}
 */
const getOrdersCntOfTopupCardByUser = async (userId, topupCardId) => {
  return TopupOrder.countDocuments({ topupCard : topupCardId, createdBy : userId, orderStatus : 'confirmed' })
                   .populate([{ path : 'topupCard', populate : [{ path : 'images', model : 'Image' }] }])
}

/**
 * Get order by id
 * @param {ObjectId} id
 * @returns {Promise<TopupOrder>}
 */
const getTopupOrderById = async (id) => {
  return TopupOrder.findById(id).populate([
    { path : 'topupCard', populate : [{ path : 'images', model : 'Image' }] }])
}


/**
 * Update order by id
 * @param {ObjectId} orderId
 * @param {Object} updateBody
 * @returns {Promise<TopupOrder>}
 */
const updateTopupOrderById = async (orderId, updateBody) => {
  const order = await getTopupOrderById(orderId)
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found')
  }

  return TopupOrder.findByIdAndUpdate(orderId, updateBody, { new : true })
                   .populate([{ path : 'topupCard', populate : [{ path : 'images', model : 'Image' }] }])
}

/**
 * Update topup by id
 * @param {ObjectId} topupId
 * @param {Object} updateBody
 * @returns {Promise<Topup>}
 */
const updateTopupById = async (topupId, updateBody) => {
  const topup = await getTopupById(topupId)
  if (!topup) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Topup not found')
  }

  Object.assign(topup, updateBody)
  await topup.save()
  return topup
}

/**
 * Delete topup by id
 * @param {ObjectId} topupId
 * @returns {Promise<Topup>}
 */
const deleteTopupById = async (topupId) => {
  const topup = await getTopupById(topupId)
  if (!topup) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Topup not found')
  }
  await topup.remove()
  return topup
}

/**
 * Get order by orderNumber
 * @param {String} orderNumber
 * @returns {Promise<TopupOrder>}
 */
const getTopupOrderByOrderNumberWithAccessCode = async (orderNumber, accessCode) => {
  return TopupOrder.findOne({ orderNumber, accessCode })
                   .populate([{ path : 'topupCard', populate : [{ path : 'images', model : 'Image' }] }])
};

/**
 * Query for topup orders
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryTopupOrders = async (filter, options) => {
  return TopupOrder.paginate(filter, options);
};

/**
 * Get topup order by orderNumber
 * @param {String} orderNumber
 * @returns {Promise<TopupOrder>}
 */
const getTopupOrderByOrderNumber = async (orderNumber) => {
  return TopupOrder.findOne({ orderNumber }).populate([{ path : 'topupCard', populate : { path : 'images' } }, { path : 'createdBy' }])
};

/**
 * Update order by orderNumber
 * @param {string} orderNumber
 * @param {Object} updateBody
 * @returns {Promise<TopupOrder>}
 */
const updateTopupOrderByOrderNumber = async (orderNumber, updateBody) => {
  const order = await getTopupOrderByOrderNumber(orderNumber);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  return TopupOrder.findByIdAndUpdate(order._id, updateBody, { new : true })
              .populate([{ path : 'topupCard', populate : 'images' }, { path : 'createdBy' }])
};


module.exports = {
  createTopup,
  queryTopups,
  getTopupById,
  updateTopupById,
  deleteTopupById,
  getActiveTopup,
  getOrdersCntOfTopupCardByUser,
  createTopupOrder,
  getTopupOrderById,
  updateTopupOrderById,
  getTopupOrderByOrderNumberWithAccessCode,
  queryTopupOrders,
  getTopupOrderByOrderNumber,
  updateTopupOrderByOrderNumber
}
