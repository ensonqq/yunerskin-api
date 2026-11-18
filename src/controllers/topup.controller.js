const httpStatus = require('http-status')
const pick = require('../utils/pick')
const ApiError = require('../utils/ApiError')
const catchAsync = require('../utils/catchAsync')
const { topupService, voucherService, orderService, emailService } = require('../services')
const { User, Order, TopupOrder } = require('../models')
const _ = require("underscore");
const moment = require("moment-timezone");
const config = require("../config/config");
const paypal = require("paypal-rest-sdk");
const { generateSecureHash } = require("../utils/asiapay");
const { topupStatistics, statistics } = require("../utils/orderStatistic");
const axios = require("axios");
const xml2json = require("xml2json");
const { runAllSalesReportOnce, kolMonthlySales, runAllTopupSalesReportOnce } = require("../report/report");
const { generateCheckoutURL, transactionEnquiry } = require("../utils/qfpay");
const stripe = require("stripe")(config.payment.stripeKey); // sandbox key
paypal.configure({
  'mode'          : config.env === 'production' ? 'live' : 'sandbox', //sandbox or live
  'client_id'     : config.payment.paypalClientId,
  'client_secret' : config.payment.paypalClientSecret
})

// Topup cards
const createTopup = catchAsync(async (req, res) => {
  const data = req.body
  data.createdBy = req.user.id
  const category = await topupService.createTopup(req.body)
  res.status(httpStatus.CREATED).send(category)
})

const getMyTopupOrders = catchAsync(async (req, res) => {
  const options = pick(req.query, ['limit', 'page']);
  options.populate = [{ path : 'topupCard', populate : 'images' }]
  const result = await topupService.queryTopupOrders({ createdBy : req.user._id, issuedTo : req.user._id, orderStatus : 'confirmed' }, {
    ...options, sortBy : '-orderNumber'
  });
  return res.send(result);
})


const getPublishedTopups = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page'])
  options.populate = [{ path : 'images' }]
  const result = await topupService.queryTopups({ publish : true }, options)
  return res.send(result)
})

const getTopups = catchAsync(async (req, res) => {
  const advanceFilter = pick(req.query, ['status', 'search'])
  const options = pick(req.query, ['sortBy', 'limit', 'page'])

  const filter = {}
  if (advanceFilter.status) {
    if (!filter.$and) filter.$and = []
    const status = advanceFilter.status
    const statusMap = {
      published   : { publish : true },
      unpublished : { publish : false },
    }

    filter.$and.push(statusMap[status]);
  }

  if (advanceFilter.search) {
    if (!filter.$and) filter.$and = []

    filter.$and.push({
      $or : ['name.zh', 'name.en', 'phone'].map(item => ({ [item] : new RegExp(advanceFilter.search, 'i') }))
    })
  }

  options.populate = [{ path : 'images' }]
  if (req.query.products) {
    options.populate.push({
      path     : 'products',
      populate : 'images category'
    })
  }

  const result = await topupService.queryTopups(filter, options)
  return res.send(result)
})

const getTopup = catchAsync(async (req, res) => {
  // const filter = { category : req.params.topupId }
  // const options = pick(req.query, ['sortBy', 'limit', 'page'])
  // options.populate = 'images category'

  const category = await topupService.getTopupById(req.params.topupId)
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Topup not found')
  }
  res.send(category)
})

const updateTopup = catchAsync(async (req, res) => {
  const category = await topupService.updateTopupById(req.params.topupId, req.body)
  res.send(category)
})

// Topup orders
const createTopupOrder = catchAsync(async (req, res) => {
  if (!config.features.creditsEnabled) {
    throw new ApiError(httpStatus.FORBIDDEN, '積分功能暫停開放。')
  }

  const orderObj = _.pick(req.body, ['topupCard', 'email', 'payment'])

  // 1. get top up card detail
  const topupDetail = await topupService.getTopupById(orderObj.topupCard)

  if (!topupDetail || !topupDetail.publish) {
    throw new ApiError(httpStatus.FORBIDDEN, '積分增值卡不存在或已下架！')
  }

  const topupQty = await topupService.getOrdersCntOfTopupCardByUser(req.user.id, orderObj.topupCard)

  if (topupQty >= topupDetail.maxQtyPerUser) {
    throw new ApiError(httpStatus.FORBIDDEN, `增值失敗，已達最大購買量：${ topupDetail.maxQtyPerUser }張！`)
  }

  //TODO: get card detail
  orderObj['createdBy'] = req.user.id
  orderObj['issuedTo'] = req.user.id
  orderObj['topupValue'] = topupDetail.credits
  orderObj['price'] = topupDetail.price


  // 5. create order
  let order = await topupService.createTopupOrder(orderObj)
  order.paidTotal = order.price
  // 6. create payment
  if (['qfpay'].includes(orderObj.payment.paymentType)) {
    const qfpay_url = await generateCheckoutURL(order, { action : "topupPaymentConfirmation" });

    return res.status(httpStatus.CREATED).send({ order, qfpay_url });
  }
})

const getTopupOrderStatus = catchAsync(async (req, res) => {
  if (!req.query.accessCode) throw new ApiError(httpStatus.FORBIDDEN, '禁止進入')

  let order = await topupService.getTopupOrderByOrderNumberWithAccessCode(req.params.orderNumber, req.query.accessCode)

  if (!order) throw new ApiError(httpStatus.NOT_FOUND, '找不到訂單')
  //skip cancelled orders check for payment again
  if (order.orderStatus === 'cancelled') throw new ApiError(httpStatus.NOT_FOUND, '訂單已被取消')

  // check payment status for qfpay
  if (["qfpay"].includes(order.payment.paymentType)) {
    const status = await transactionEnquiry(order);
    if (status === "success") {
      order = await topupService.updateTopupOrderById(order.id, { "payment.paymentStatus" : 'completed', orderStatus : 'confirmed' })
      await topupStatistics(order)
    } else {
      order = await topupService.updateTopupOrderById(order.id, { "payment.paymentStatus" : 'failed', orderStatus : 'payment_failed' })
    }
  }

  return res.send(order)
})

const getTopupOrders = catchAsync(async (req, res) => {
  const basicFilter = pick(req.query, ['orderStatus']);
  const advanceFilter = pick(req.query, ['search', 'createdAtFrom', 'createdAtTo']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // construct orders filtering
  let filter = { $and : [] };
  _.forEach(basicFilter, function (value, key) {
    filter.$and.push({ [key] : value });
  });

  if (advanceFilter.createdAtFrom && advanceFilter.createdAtTo) {
    filter.$and.push({ createdAt : { $gte : advanceFilter.createdAtFrom, $lt : advanceFilter.createdAtTo } })
    // filter.$and.push({ createdAt : { $lt : advanceFilter.createdAtTo } })
  }

  //ignore all filters
  if (advanceFilter.search) {
    filter = { $and : [] }

    let userIds = []
    const phone = parseInt(advanceFilter.search)
    if (_.isNumber(phone) && phone.toString().length === 8) {
      const users = await User.find({
        $or : [
          { 'addresses.phone' : new RegExp(advanceFilter.search, 'i') },
          { 'pickupAddresses.phone' : new RegExp(advanceFilter.search, 'i') }
        ]
      })

      if (users.length) {
        userIds = users.map(user => ({ createdBy : user.id }))
      }
    }

    filter.$and.push({
      $or : (['orderNumber', 'email'].map(item => ({ [item] : new RegExp(advanceFilter.search, 'i') }))).concat(userIds)
    })
  }

  options.populate = [{ path : 'topupCard', populate : 'images' }, { path : 'createdBy' }, { path : 'issuedTo' }]

  const result = await topupService.queryTopupOrders(filter, options);
  return res.send(result);
})

const getTopupOrder = catchAsync(async (req, res) => {
  const order = await topupService.getTopupOrderByOrderNumber(req.params.orderNumber)
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, '找不到訂單')
  }
  res.send(order)
})

const updateTopupOrder = catchAsync(async (req, res) => {
  const oldOrder = await topupService.getTopupOrderByOrderNumber(req.params.orderNumber)
  const newOrder = await topupService.updateTopupOrderByOrderNumber(req.params.orderNumber, req.body)

  // change of status: confirmed/cancelled, re-run all report once
  if (oldOrder.orderStatus !== newOrder.orderStatus) {
    const orderTimeStamp = newOrder.createdAt
    await runAllTopupSalesReportOnce(orderTimeStamp)

    if (oldOrder.orderStatus === 'confirmed' && newOrder.orderStatus === 'cancelled') {      //order
      const updateObj = {
        totalOrders : 0,
        totalSpent  : 0
      }

      // cancel order, change user total spent and credits
      const orders = await Order.find({ createdBy : newOrder.createdBy.id, orderStatus : 'confirmed' }, {})

      orders.forEach(order => {
        updateObj.totalSpent += order.paidTotal
        updateObj.totalOrders += 1
      })

      //topup
      const topups = await TopupOrder.find({ createdBy : newOrder.createdBy.id, orderStatus : 'confirmed' }, {})
      topups.forEach(topup => {
        updateObj.totalSpent += topup.price
      })

      if (config.features.creditsEnabled) {
        updateObj['$inc'] = { credits : -newOrder.topupValue }
      }

      await User.findByIdAndUpdate(newOrder.createdBy.id, updateObj)
    }
  }

  return res.send(newOrder)
})

const resendTopupOrderReceipt = catchAsync(async (req, res) => {
  const order = await topupService.getTopupOrderByOrderNumber(req.params.orderNumber)
  const result = sendTopupOrderReceipt(order).catch(error => {
    console.log(error)
  })
  return res.send(result)
})

const sendTopupOrderReceipt = async (order) => {
  try {
    const result = await emailService.sendTopupOrderReceipt(order)
    return result
  } catch (e) {
    console.log(e)
  }
}

const getUserTopups = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['orderStatus'])
  filter.createdBy = req.params.userId
  const options = pick(req.query, ['sortBy', 'limit', 'page'])
  options.populate = [{ path : 'topupCard', populate : 'images' }, { path : 'createdBy' }, { path : 'issuedTo' }]
  const result = await topupService.queryTopupOrders(filter, options)
  res.send(result)
})


module.exports = {
  createTopup,
  getTopups,
  getTopup,
  updateTopup,
  getPublishedTopups,
  createTopupOrder,
  getTopupOrderStatus,
  getMyTopupOrders,
  getTopupOrders,
  getTopupOrder,
  updateTopupOrder,
  resendTopupOrderReceipt,
  getUserTopups
}
