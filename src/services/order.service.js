const httpStatus = require('http-status');
const { Order } = require('../models');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose')
/**
 * Create an order
 * @param {Object} orderBody
 * @returns {Promise<Order>}
 */
const createOrder = async (orderBody) => {
  return Order.create(orderBody);
};

/**
 * Query for orders
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryOrders = async (filter, options) => {
  return Order.paginate(filter, options);
};

/**
 * Get order by id
 * @param {ObjectId} id
 * @returns {Promise<Order>}
 */
const getOrderById = async (id) => {
  return Order.findById(id);
};

/**
 * Get order by orderNumber
 * @param {String} orderNumber
 * @returns {Promise<Order>}
 */
const getOrderByOrderNumber = async (orderNumber) => {
  return Order.findOne({ orderNumber })
              .populate([
                {
                  path     : 'items',
                  populate : {
                    path     : 'product',
                    model    : 'Product',
                    populate : {
                      path  : 'images',
                      model : 'Image'
                    }
                  }
                },
                { path : 'createdBy' }, { path : 'voucherUsed' },
                { path : 'prize', populate : { path : 'product', populate : { path : 'images' } } },
                {
                  path     : 'gift',
                  populate : [{ path : 'product', populate : { path : 'images' } },
                    { path : 'giftRef', populate : [{ path : 'images' }, { path : 'product' }] }]
                }
              ])
};

/**
 * Get order by billNo
 * @param {String} billNo
 * @returns {Promise<Order>}
 */
const getOrderByBillNo = async (billNo) => {
  return Order.findOne({ 'delivery.billNo' : billNo })
              .populate([
                {
                  path     : 'items',
                  populate : {
                    path     : 'product',
                    model    : 'Product',
                    populate : {
                      path  : 'images',
                      model : 'Image'
                    }
                  }
                },
                { path : 'createdBy' }, { path : 'voucherUsed' }])
};


/**
 * Get order by orderNumber
 * @param {String} orderNumber
 * @returns {Promise<Order>}
 */
const getOrderByOrderNumberWithAccessCode = async (orderNumber, accessCode) => {
  return Order.findOne({ orderNumber, accessCode })
              .populate([
                {
                  path     : 'items',
                  populate : {
                    path     : 'product',
                    model    : 'Product',
                    populate : {
                      path  : 'images',
                      model : 'Image'
                    }
                  }
                },
                { path : 'createdBy' }, { path : 'voucherUsed' }])
};


/**
 * Get order by name
 * @param {String} orderName
 * @returns {Promise<Order>}
 */
const getOrderByName = async (orderName) => {
  const order = await Order.findOne({ $or : [{ 'name.zh' : orderName }, { 'name.en' : orderName }] }).populate('images category');
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }
  return order;
};

/**
 * Get orders with voucher
 * @param {ObjectId} voucherId
 * @returns {Promise<Order>}
 */
const getVoucherOrders = async (voucherId) => {
  return Order.find({ orderStatus : 'confirmed', voucherUsed : voucherId })
              .populate([{ path : 'images' }, { path : 'category' }, { path : 'items', populate : { path : 'product' } }, { path : 'voucherUsed' }]);
};

/**
 * Map cart items for non-member
 * @param {Array} items
 * @returns {Promise<Order>}
 */
const mapCartItems = async (items) => {
  const itemIdsMapper = {}
  const itemIds = items.map(item => {
    itemIdsMapper[item.order] = item.quantity
    return item.order
  })
  const orders = await Order.find({ _id : { $in : itemIds } }).populate('images')
  return { items : orders.map(order => ({ order, quantity : itemIdsMapper[order.id] })) }
};

/**
 * Update order by id
 * @param {ObjectId} orderId
 * @param {Object} updateBody
 * @returns {Promise<Order>}
 */
const updateOrderById = async (orderId, updateBody) => {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  return Order.findByIdAndUpdate(orderId, updateBody, { new : true }).populate([
    {
      path     : 'items',
      populate : {
        path     : 'product', model : 'Product',
        populate : [
          { path : 'images', model : 'Image' },
          { path : 'category', model : 'Category' }
        ]
      }
    },
    { path : 'voucherUsed' },
    { path : 'prize', populate : { path : 'product', populate : { path : 'images' } } },
    {
      path     : 'gift',
      populate : [{ path : 'product', populate : { path : 'images' } }, { path : 'giftRef', populate : [{ path : 'images' }, { path : 'product' }] }]
    }])
};

/**
 * Update order by orderNumber
 * @param {string} orderNumber
 * @param {Object} updateBody
 * @returns {Promise<Order>}
 */
const updateOrderByOrderNumber = async (orderNumber, updateBody) => {
  const order = await getOrderByOrderNumber(orderNumber);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  return Order.findByIdAndUpdate(order._id, updateBody, { new : true })
              .populate([{ path : 'voucherUsed' }, { path : 'items', populate : 'product' }, { path : 'createdBy' }])
};

/**
 * Update order by billNo
 * @param {string} billNo
 * @param {Object} updateBody
 * @returns {Promise<Order>}
 */
const updateOrderByOrderBillBo = async (billNo, updateBody) => {
  const order = await getOrderByBillNo(billNo);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  return Order.findByIdAndUpdate(order._id, updateBody, { new : true })
              .populate([
                { path : 'voucherUsed' },
                {
                  path     : 'items',
                  populate : {
                    path     : 'product',
                    populate : [
                      {
                        path     : 'bundleItems',
                        populate : {
                          path     : 'product',
                          populate : [{ path : 'images' }, { path : 'category' }]
                        }
                      },
                      { path : 'category' }
                    ]
                  }

                },
                { path : 'createdBy' },
                { path : 'prize', populate : { path : 'product', populate : 'images' } },
                {
                  path     : 'gift',
                  populate : [{ path : 'product', populate : { path : 'images' } },
                    { path : 'giftRef', populate : [{ path : 'images' }, { path : 'product' }] }]
                }
              ])
};


/**
 * Update order by orderNumber
 * @param {Array} orderIds
 * @returns {Promise<Order>}
 */
const updateOrderToPrinted = async (orderIds) => {
  return Order.updateMany({ '_id' : { $in : orderIds } }, { $set : { printed : true } })
};

/**
 * Delete order by id
 * @param {ObjectId} orderId
 * @returns {Promise<Order>}
 */
const deleteOrderById = async (orderId) => {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }
  await order.remove();
  return order;
};

module.exports = {
  createOrder,
  queryOrders,
  getOrderById,
  updateOrderById,
  deleteOrderById,
  getOrderByName,
  mapCartItems,
  getOrderByOrderNumber,
  updateOrderByOrderNumber,
  updateOrderToPrinted,
  getOrderByOrderNumberWithAccessCode,
  getVoucherOrders,
  updateOrderByOrderBillBo
};
