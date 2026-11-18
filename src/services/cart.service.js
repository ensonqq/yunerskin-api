const httpStatus = require('http-status')
const { Cart, Product } = require('../models')
const ApiError = require('../utils/ApiError')

const validateItemsMaxPurchaseQtyPerOrder = async (items = []) => {
  const itemIds = [...new Set(items.map(item => item.product && item.product.toString()).filter(Boolean))]
  if (!itemIds.length) {
    return
  }

  const products = await Product.find({ _id : { $in : itemIds } }).select('_id maxPurchaseQtyPerOrder')
  const productMaxQtyMap = {}
  products.forEach((product) => {
    productMaxQtyMap[product.id] = Number(product.maxPurchaseQtyPerOrder || 0)
  })

  for (const item of items) {
    const productId = item.product && item.product.toString()
    if (!productId) {
      continue
    }

    const maxQty = Number(productMaxQtyMap[productId] || 0)
    if (maxQty >= 1 && item.quantity > maxQty) {
      throw new ApiError(httpStatus.BAD_REQUEST, `單一訂單最多可購買 ${ maxQty } 件`)
    }
  }
}

/**
 * Create a cart
 * @param {ObjectId} userId
 * @param {Object} items
 * @returns {Promise<Voucher>}
 */
const updateCart = async (userId, items) => {
  await validateItemsMaxPurchaseQtyPerOrder(items)
  return Cart.findOneAndUpdate({ createdBy : userId }, { items }, { upsert : true, new : true })
             .populate({
               path     : 'items.product',
               populate : { path : 'images', model : 'Image' }
             })
             .populate('item.product.images')
}

/**
 * Query for cart
 * @param {ObjectId} createdBy
 * @returns {Promise<QueryResult>}
 */
const myCart = async (createdBy) => {
  return Cart.findOne({ createdBy })
             .populate({
               path     : 'items.product',
               populate : { path : 'images', model : 'Image' }
             })
}

module.exports = {
  updateCart,
  myCart
}
