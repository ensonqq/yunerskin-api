const httpStatus = require('http-status');
const catchAsync = require("../utils/catchAsync");
const moment = require('moment-timezone')
const User = require('../models/user.model')
const Order = require('../models/order.model')
const Sales = require('../models/sales.model')
const _ = require('lodash')
const { orderService } = require("../services");
const { TopupOrder } = require("../models");
//dashboard stats
exports.getDashboard = catchAsync(async (req, res, next) => {
  const [
    today,
    user,
    turnover,
    pendingStudents,
    oderRate,
    completeRate,
    order,
    skuQuantities,
    newUsersPast7Days,
    newUsersToday,
    thisMonth,
    yearsSalesGraph,
    paymentMethodsGraph,
    compareToLastMonth,
    deliveryTypeGraph,
    topupGraph,
  ] = await Promise.all([
    getTodayStat(),
    getUserReport(),
    getTurnOver(),
    getPendingStudents(),
    getOrderRate(),
    getCompleteRate(),
    getOrders(),
    getSkuQuantities(),
    getNewUsersPast7Days(),
    getNewUsersToday(),
    getThisMonth(),
    getYearsSalesGraph(),
    getPaymentMethodsGraph(),
    getCompareToLastMonth(),
    getDeliveryTypeGraph(),
    getTopupGraph(),
  ])
  return res.send({
    user, turnover, order, skuQuantities, newUsersPast7Days, turnoverThisMonth : thisMonth?.turnover || 0, ordersThisMonth : thisMonth?.orders || 0,
    yearsSalesGraph, completeRate, oderRate, compareToLastMonth, newUsersToday, pendingStudents, today, paymentMethodsGraph, deliveryTypeGraph,
    topupGraph
  })
})

exports.getReorderRate = catchAsync(async (req, res, next) => {
  const timestamp30 = moment.tz('Asia/Hong_Kong').add(-30, 'day').startOf('day').toISOString()
  const timestamp60 = moment.tz('Asia/Hong_Kong').add(-60, 'day').startOf('day').toISOString()
  const timestamp90 = moment.tz('Asia/Hong_Kong').add(-90, 'day').startOf('day').toISOString()
  const timestamp120 = moment.tz('Asia/Hong_Kong').add(-120, 'day').startOf('day').toISOString()

  const orderedUsers = await User.countDocuments({ totalOrders : { $gte : 1 } })

  const recentOrders30 = await Order.find({ orderStatus : 'confirmed', createdAt : { $gte : timestamp30 }, createdBy : { $ne : null } })
                                    .populate('createdBy') // 1month

  // const recentOrders60 = await Order.find({ orderStatus : 'confirmed', createdAt : { $gte : timestamp60 }, createdBy : { $ne : null } })
  //                                   .populate('createdBy') // 1month
  //
  // const recentOrders90 = await Order.find({ orderStatus : 'confirmed', createdAt : { $gte : timestamp90 }, createdBy : { $ne : null } })
  //                                   .populate('createdBy') // 1month
  //
  // const recentOrders120 = await Order.find({ orderStatus : 'confirmed', createdAt : { $gte : timestamp120 }, createdBy : { $ne : null } })
  //                                   .populate('createdBy') // 1month

  const reorderedUsers30 = _.uniq(recentOrders30.filter(order => order.createdBy.totalOrders >= 2).map(order => order.createdBy.email)).length
  // const reorderedUsers60 = _.uniq(recentOrders60.filter(order => order.createdBy.totalOrders >= 2).map(order => order.createdBy.email)).length
  // const reorderedUsers90 = _.uniq(recentOrders90.filter(order => order.createdBy.totalOrders >= 2).map(order => order.createdBy.email)).length
  // const reorderedUsers120 = _.uniq(recentOrders120.filter(order => order.createdBy.totalOrders >= 2).map(order => order.createdBy.email)).length
  const reorderRate30 = _.toNumber(((reorderedUsers30 / orderedUsers) * 100).toFixed(1))
  // const reorderRate60 = _.toNumber(((reorderedUsers60 / orderedUsers) * 100).toFixed(1))
  // const reorderRate90 = _.toNumber(((reorderedUsers90 / orderedUsers) * 100).toFixed(1))
  // const reorderRate120 = _.toNumber(((reorderedUsers120 / orderedUsers) * 100).toFixed(1))


  return res.send({
    result : {
      reorderRate30,
      // reorderRate60,
      // reorderRate90,
      // reorderRate120,
    }
  })
})

async function getTopupGraph () {
  // const topUpTotal = await User.countDocuments({ totalOrders : { $gte : 1 } })
  let creditPool = 0
  const [creditResult, topupResult, totalOrdersCnt] = await Promise.all([
    User.aggregate(
      [
        { $match : { role : 'user', credits : { $gte : 1 } } },
        { $group : { _id : null, creditPool : { $sum : "$credits" } } }, { $unset : '_id' },
      ]
    ),
    TopupOrder.aggregate(
      [
        { $match : { orderStatus : 'confirmed', 'payment.paymentType' : { $ne : 'admin' } } },
        {
          $group : {
            _id : null, topupTotal : { $sum : "$price" }, topupCreditsTotal : { $sum : "$topupValue" }
          }
        },
        { $unset : '_id' },
      ]
    ),
    TopupOrder.countDocuments({ orderStatus : 'confirmed', 'payment.paymentType' : { $ne : 'admin' } })
  ])
  if (creditResult.length) {
    creditPool = creditResult[0].creditPool
  }

  let topupTotal = 0
  let topupCreditsTotal = 0
  if (topupResult.length) {
    topupTotal = topupResult[0].topupTotal
    topupCreditsTotal = topupResult[0].topupCreditsTotal
  }
  return { creditPool, topupTotal, topupCreditsTotal, totalOrdersCnt }
}


async function getDeliveryTypeGraph () {
  const grouped = await Order.aggregate([
    { $match : { orderStatus : 'confirmed' } },
    { $group : { _id : '$deliveryType', count : { $sum : 1 } } }
  ])
  const countMap = grouped.reduce((acc, item) => {
    acc[item._id === null ? 'null' : item._id] = item.count
    return acc
  }, {})

  return [
    { name : 'delivery', count : (countMap.delivery || 0) + (countMap.null || 0) },
    { name : 'pickup', count : countMap.pickup || 0 }
  ]
}


async function getYearsSalesGraph () {
  const data = await Sales.find({ reportType : 'monthly' }).select('year turnover').sort('date').lean()
  const years = {}
  data.forEach(item => {
    if (!years[item.year]) years[item.year] = []
    years[item.year].push(item.turnover)
  })

  return years
}

async function getPaymentMethodsGraph () {
  const methods = ['stripe', 'paypal', 'payme', 'alipay', 'wechatpay', 'fps', 'octopus', 'admin']
  const grouped = await Order.aggregate([
    { $match : { orderStatus : 'confirmed', 'payment.paymentType' : { $in : methods } } },
    { $group : { _id : '$payment.paymentType', count : { $sum : 1 } } }
  ])
  const countMap = grouped.reduce((acc, item) => {
    acc[item._id] = item.count
    return acc
  }, {})

  return methods.map((name) => ({ name, count : countMap[name] || 0 }))
}

async function getThisMonth () {
  const now = moment.tz('Asia/Hong_Kong').startOf('month').format('YYYY-MM')
  return Sales.findOne({ reportType : 'monthly', date : now }).select('turnover orders').lean()
}

async function getNewUsersPast7Days () {
  const timestamp = moment.tz('Asia/Hong_Kong').add(-7, 'day').startOf('day').toISOString()
  return User.countDocuments({ role : 'user', createdAt : { $gte : timestamp } })
}

async function getNewUsersToday () {
  const timestamp = moment.tz('Asia/Hong_Kong').startOf('day').toISOString()
  return User.countDocuments({ role : 'user', createdAt : { $gte : timestamp } })
}

async function getPendingStudents () {
  return User.countDocuments({ isStudent : true, 'student.status' : 'pending' }) // 1month
}

async function getCompareToLastMonth () {
  const thisMonth = moment.tz('Asia/Hong_Kong').format('YYYY-MM')
  const lastMonth = moment.tz('Asia/Hong_Kong').add('-1', 'month').format('YYYY-MM')
  const [lastMonthSales, thisMonthSales] = await Promise.all([
    Sales.findOne({ reportType : 'monthly', date : lastMonth }).select('turnover').lean(),
    Sales.findOne({ reportType : 'monthly', date : thisMonth }).select('turnover').lean(),
  ])

  if (!lastMonthSales?.turnover || !thisMonthSales?.turnover) {
    return 0
  }

  return _.toNumber((((thisMonthSales.turnover - lastMonthSales.turnover) / lastMonthSales.turnover) * 100).toFixed(1))
}

async function getOrderRate () {
  const [ordered, total] = await Promise.all([
    User.countDocuments({ role : 'user', totalOrders : { $gte : 1 } }),
    User.countDocuments({ role : 'user' })
  ])
  if (!total) {
    return 0
  }
  return _.toNumber(((ordered / total) * 100).toFixed(1))
}

async function getCompleteRate () {
  const [ordered, total] = await Promise.all([
    Order.countDocuments({ orderStatus : 'confirmed' }),
    Order.countDocuments()
  ])
  if (!total) {
    return 0
  }
  return _.toNumber(((ordered / total) * 100).toFixed(1))
}

async function getTurnOver () {
  const [total, lastMonth, highestMonth] = await Promise.all([
    Sales.aggregate([
      { $match : { reportType : 'daily' } },
      { $group : { _id : null, total : { $sum : "$turnover" } } }
    ]),
    Sales.findOne({ date : moment().add(-1, 'month').format('YYYY-MM'), reportType : 'monthly' }).select('turnover').lean(),
    Sales.findOne({ reportType : 'monthly' }).select('turnover date').sort('-turnover').lean()
  ])

  const totalTurnover = total[0]?.total || 0
  const months = moment().diff(moment('2019-03-01'), 'months', true)
  const monthAvg = months > 0 ? (totalTurnover / months).toFixed(0) : '0'

  return { total : totalTurnover, monthAvg, lastMonth : lastMonth?.turnover || 0, highestMonth }
}

async function getTodayStat () {
  const date = moment.tz('Asia/Hong_Kong')
  const startOfDay = moment.tz('Asia/Hong_Kong').startOf('day').toISOString()
  const endOfDay = moment.tz('Asia/Hong_Kong').endOf('day').toISOString()
  const [todaySummary, ordersFromMemberToday, todayOrders] = await Promise.all([
    Sales.findOne({ reportType : 'daily', date : date.format('YYYY-MM-DD') })
      .populate([{ path : 'catSummary', populate : { path : 'category' } }])
      .lean(),
    Order.find({
      $and : [
        { orderStatus : 'confirmed' },
        { createdAt : { $gte : startOfDay } },
        { createdAt : { $lte : endOfDay } },
        { createdBy : { $ne : null } }
      ]
    }).populate('createdBy', 'totalOrders').lean(),
    orderService.queryOrders({
      createdAt : { $gte : startOfDay, $lt : endOfDay }, orderStatus : 'confirmed'
    }, { limit : 99999, populate : [{ path : 'voucherUsed' }, { path : 'items', populate : 'product' }, { path : 'createdBy' }] })
  ])

  let reorderToday = 0
  if (ordersFromMemberToday.length) {
    reorderToday = ordersFromMemberToday.filter(order => {
      return order.createdBy?.totalOrders >= 2
    }).length
  }

  return { todaySummary, todayOrders, reorderToday }
}

async function getOrders () {
  const [total, highestMonth] = await Promise.all([
    Sales.aggregate([
      { $match : { reportType : 'daily' } },
      { $group : { _id : null, totalOrders : { $sum : "$orders" }, totalQuantities : { $sum : "$quantity" } } }
    ]),
    Sales.findOne({ reportType : 'monthly' }).select('orders date').sort('-orders').lean()
  ])

  const totalOrders = total[0]?.totalOrders || 0
  const totalQuantities = total[0]?.totalQuantities || 0
  const months = moment().diff(moment('2019-03-01'), 'months', true)
  const monthAvg = months > 0 ? (totalOrders / months).toFixed(0) : '0'
  const quantityAvg = totalOrders > 0 ? (totalQuantities / totalOrders).toFixed(1) : '0.0'
  return { total : totalOrders, monthAvg, quantityAvg, highestMonth }
}

async function getSkuQuantities () {
  const [total, sales] = await Promise.all([
    Sales.aggregate([
      { $match : { reportType : 'daily' } },
      { $group : { _id : null, total : { $sum : "$quantity" } } }
    ]),
    Sales.find({ reportType : 'monthly' }).select('catSummary').populate('catSummary.category').lean()
  ])

  const totalQuantity = total[0]?.total || 0
  const months = moment().diff(moment('2019-03-01'), 'months', true)
  const monthAvg = months > 0 ? (totalQuantity / months).toFixed(0) : '0'

  const categories = {}
  sales.forEach(item => {
    item.catSummary.forEach(cat => {
      const name = cat?.category?.name?.zh
      if (!name) {
        return
      }
      if (!categories[name]) categories[name] = 0

      categories[name] += cat.quantity
    })
  })
  return { total : totalQuantity, monthAvg, categories }
}

async function getUserReport () {
  const timestamp = moment.tz('Asia/Hong_Kong').add(-30, 'day').startOf('day').toISOString()
  const [total, maleUsers, femaleUsers, totalPurchasedUsers, newUsers7daysPurchased, newUsers7daysNotPurchased] = await Promise.all([
    User.countDocuments({ role : 'user' }),
    User.countDocuments({ role : 'user', gender : 'm' }),
    User.countDocuments({ role : 'user', gender : 'f' }),
    User.countDocuments({ totalOrders : { $gte : 1 } }),
    User.countDocuments({ role : 'user', createdAt : { $gte : timestamp }, totalOrders : { $gte : 1 } }),
    User.countDocuments({ role : 'user', createdAt : { $gte : timestamp }, totalOrders : { $lte : 0 } })
  ])

  return {
    total,
    totalPurchasedUsers,
    maleUsers,
    femaleUsers,
    month : {
      total        : newUsers7daysPurchased + newUsers7daysNotPurchased,
      purchased    : newUsers7daysPurchased,
      notPurchased : newUsers7daysNotPurchased
    },
  }
}
