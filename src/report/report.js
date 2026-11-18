const moment = require("moment-timezone");
const _ = require("lodash");
const { Order, Category, Sales, Voucher, KolSales, TopupOrder, KolContract, TopupSales, Product } = require("../models");
const logger = require("../config/logger");
const { orderService, topupService, userService } = require("../services");
const ApiError = require("../utils/ApiError");
const httpStatus = require("http-status");
const config = require("../config/config");
const xml2json = require("xml2json");
const stripe = require("stripe")(config.payment.stripeKey); // sandbox key
const paypal = require('paypal-rest-sdk')
const axios = require("axios")
const User = require("../models/user.model");
const { statistics, topupStatistics } = require("../utils/orderStatistic");
const { transactionEnquiry } = require("../utils/qfpay");
/******* paypal config ******/
paypal.configure({
  'mode'          : config.env === 'production' ? 'live' : 'sandbox', //sandbox or live
  'client_id'     : config.payment.paypalClientId,
  'client_secret' : config.payment.paypalClientSecret
})


const orderStatusCheck = async function () {
  try {
    // time now HKT
    const _30_min_ago = moment().add(-30, 'minute')
    const _1_min_ago = moment().add(-1, 'minute')
    // query today orders
    const orders = await Order.find({
      $and : [{ createdAt : { $gte : _30_min_ago.toISOString() } }, { createdAt : { $lte : _1_min_ago.toISOString() } },
        { orderStatus : 'pending_payment' }]
    }).populate([{ path : 'items', populate : { path : 'product' } }])

    for (let i in orders) {
      const order = orders[i]
      // qfpay
      if (["qfpay"].includes(order.payment.paymentType)) {
        const status = await transactionEnquiry(order);
        if (status === "success") {
          let updatedOrder = await orderService.updateOrderById(order.id, { "payment.paymentStatus" : 'completed', orderStatus : 'confirmed' })
          await statistics(updatedOrder)
        } else {
          // let updatedOrder = await orderService.updateOrderById(order.id, { "payment.paymentStatus" : 'failed', orderStatus : 'payment_failed' })
        }
      }
    }
    return logger.info(`done checking order status of orders between 30mins before and 1mins before every 20seconds.`)
  } catch (e) {
    logger.error(e)
  }
}

const expirePendingOrders = async function () {
  try {
    // time now HKT
    const _60_min_ago = moment().add(-60, 'minute')
    const _30_min_ago = moment().add(-30, 'minute')
    // query today orders
    const orders = await Order.find({
      $and : [{ createdAt : { $gte : _60_min_ago.toISOString() } }, { createdAt : { $lte : _30_min_ago.toISOString() } },
        { orderStatus : 'pending_payment' }]
    }).populate([{ path : 'items', populate : { path : 'product' } }])

    for (let i in orders) {
      const order = orders[i]
      await orderService.updateOrderById(order.id, { "payment.paymentStatus" : 'failed', orderStatus : 'payment_failed' })

      if (config.features.creditsEnabled && order.creditsUsed && order.createdBy) {
        await User.findByIdAndUpdate(order.createdBy, { "$inc" : { "credits" : order.creditsUsed, } })
      }
    }
    return logger.info(`done expiring old pending orders between 30mins before and 60mins before for every 20seconds.`)
  } catch (e) {
    logger.error(e)
  }
}

const topupOrderStatusCheck = async function () {
  try {
    // time now HKT
    const _30_min_ago = moment().add(-30, 'minute')
    const _1_min_ago = moment().add(-1, 'minute')
    // query today orders
    const orders = await TopupOrder.find({
      $and : [{ createdAt : { $gte : _30_min_ago.toISOString() } }, { createdAt : { $lte : _1_min_ago.toISOString() } },
        { orderStatus : 'pending_payment' }]
    })

    for (let i in orders) {
      const order = orders[i]

      if (["qfpay"].includes(order.payment.paymentType)) {
        const status = await transactionEnquiry(order);

        if (status === "success") {
          let updatedOrder = await topupService.updateTopupOrderById(order.id, { "payment.paymentStatus" : 'completed', orderStatus : 'confirmed' })
          await topupStatistics(updatedOrder)
        } else {
          // let updatedOrder = await topupService.updateTopupOrderById(order.id, { "payment.paymentStatus" : 'failed', orderStatus : 'payment_failed' })
        }
      }
    }
    return logger.info(`done checking top up order status of orders between 30mins before and 1mins before every 20seconds.`)
  } catch (e) {
    logger.error(e)
  }
}

const dailySales = async function (date) {
  try {
    // time now HKT
    const now = date ? moment(date).tz('Asia/Hong_Kong') : moment.tz('Asia/Hong_Kong').add('-10', 'minute')
    const _productSellingPriceObj = {}
    const products = await Product.find({})
    products.forEach(product => {
      _productSellingPriceObj[product._id] = []
    })

    // construct data model tobe injected
    const data = {
      reportType       : 'daily',
      date             : now.clone().format('YYYY-MM-DD'),
      year             : _.toInteger(now.clone().format('YYYY')),
      month            : _.toInteger(now.clone().format('M')),
      day              : _.toInteger(now.clone().format('D')),
      catSummary       : [],
      quantity         : 0,
      orders           : 0,
      deliveryTypeCtn  : {
        delivery : 0,
        pickup   : 0,
      },
      incompleteOrders : 0,
      cancelledOrders  : 0,
      memberOrders     : 0,
      nonMemberOrders  : 0,
      turnover         : 0,
    }


    // query today orders
    const orders = await Order.find({
      $and : [{ createdAt : { $gte : now.clone().startOf('day').toISOString() } }, { createdAt : { $lt : now.clone().endOf('day').toISOString() } },]
    }).populate([
      {
        path     : 'items',
        populate : {
          path     : 'product',
          populate : [
            {
              path     : 'bundleItems',
              populate : {
                path     : 'product',
                populate : [
                  { path : 'images' },
                  { path : 'category' }
                ]
              }
            },
            { path : 'category' }
          ]
        }
      },
      { path : 'voucherUsed' },
    ])

    const catItemsCount = {}
    const categories = await Category.find()
    categories.forEach(cat => {
      catItemsCount[cat.id] = {
        category : cat.id,
        quantity : 0
      }
    })
    const productSellingPriceObj = _.cloneDeep(_productSellingPriceObj)
    orders.forEach(order => {
      // pending orders count
      if (order.orderStatus === 'pending_payment') data.incompleteOrders += 1

      // cancel orders count
      if (order.orderStatus === 'cancelled') data.cancelledOrders += 1


      if (order.orderStatus === 'confirmed') {
        // confirm orders count
        data.orders += 1

        if (order.deliveryType === 'delivery') {
          data.deliveryTypeCtn.delivery += 1
        } else {
          data.deliveryTypeCtn.pickup += 1
        }

        // turn over of the day
        data.turnover += order.paidTotal

        if (order.createdBy) {
          // member orders count (confirmed orders)
          data.memberOrders += 1
        } else {
          // non-member orders count (confirmed orders)
          data.nonMemberOrders += 1
        }

        // avg sku selling price
        // voucher discount
        const voucherDiscount = order.voucherUsed

        //  cat tier discount
        // {'雞胸': -4, '點心' : -3}
        let catDiscount = {}
        if (order.autoDiscountTiersAdopted.length) {
          order.autoDiscountTiersAdopted.forEach(item => {
            // console.log(item.desc)
            if (item.desc) {
              const cat = item.desc.split('：')[0]
              const price = item.desc.split('每件減$')[1]
              if(!catDiscount[cat]) catDiscount[cat] = 0
              catDiscount[cat] -= price
            }
          })
        }

        if (order.buyXGetYFreeAdopted.length) {
          const catCnt = {}
          categories.forEach(cat => {
            catCnt[cat.name.zh] = {
              category : cat.id,
              quantity : 0
            }
          })
          order.items.forEach(item => {
            catCnt[item.product.category.name.zh].quantity += item.quantity
          })

          order.buyXGetYFreeAdopted.forEach(item => {
            // console.log(item.desc)
            if (item.desc) {
              const cat = item.desc.split('：')[0]
              const totalDiscount = _.sumBy(item.freeItems, 'sellingPrice')
              const price = totalDiscount / catCnt[cat].quantity
              if(!catDiscount[cat]) catDiscount[cat] = 0
              catDiscount[cat] -= price
            }
          })
        }

        //  gold, diamond tier
        let vipDiscount = 0
        if (order.vipTierDiscount.length) {
          vipDiscount = -1
        }


        const totalItems = _.sumBy(order.items, 'quantity')
        // quantity by category
        order.items.forEach(item => {
          if (item.product.isBundled) {
            catItemsCount[item.product.category.id].quantity += item.quantity
            item.product.bundleItems.forEach(bundleItem => {
              catItemsCount[bundleItem.product.category.id].quantity += item.quantity * bundleItem.quantity
              data.quantity += item.quantity * bundleItem.quantity
            })
          } else {
            catItemsCount[item.product.category.id].quantity += item.quantity
            data.quantity += item.quantity
          }

          /**
           * SKU AVG SELLING PRICE
           */
            // console.log('----------------------------')
          const product = item.product
          const category = item.product.category
          let sellingPrice = item.unitPrice
          // console.log('sellingPrice:', sellingPrice)

          // vip discount
          if (vipDiscount < 0) sellingPrice += vipDiscount // console.log('vipDiscount:', vipDiscount)

          // cat discount
          if (Object.keys(catDiscount).length && catDiscount[category.name.zh]) sellingPrice += catDiscount[category.name.zh]   // console.log('catDiscount:',
          // catDiscount[category.name.zh])
          // voucher discount
          if (voucherDiscount) {
            // ignore voucher type = fixed
            if (voucherDiscount.type === 'fixed') {
              const avgFixedDiscount = voucherDiscount.value / totalItems
              sellingPrice += avgFixedDiscount

              // console.log('voucherDiscount (' + voucherDiscount.type + ') | totalItems: ' + totalItems + ' | disCountTotal: ' +
              // voucherDiscount.value + ':', avgFixedDiscount)
            }
            if (voucherDiscount.type === 'percent') {
              const percent = (voucherDiscount.value + 100) / 100
              sellingPrice = sellingPrice * percent
              // console.log('voucherDiscount (' + voucherDiscount.type + '): ' + percent * 100 + '%')
            }
          }

          productSellingPriceObj[product._id].push({ sellingPrice, quantity : item.quantity })
          /**
           * END SKU AVG SELLING PRICE
           */

        })
      }
    })
    data.catSummary = Object.values(catItemsCount)

    data.skuSellingPrice = []
    for (let i in productSellingPriceObj) {
      const product = i
      const price = _.mean(productSellingPriceObj[i].filter(item => item.sellingPrice).map(item => item.sellingPrice))
      const quantity = _.sumBy(productSellingPriceObj[i], 'quantity')
      data.skuSellingPrice.push({ price : price ? price.toFixed(2) : null, quantity, product })
    }

    // import to db
    await Sales.findOneAndUpdate({ date : data.date, reportType : 'daily' }, { $set : data }, { upsert : true })
    return logger.info(`done daily sales report of ${ data.date }`)
  } catch (e) {
    logger.error(e)
  }
}

const weeklySales = async function (date) {
  try {
    // time now HKT
    const now = date ? moment(date).tz('Asia/Hong_Kong') : moment.tz('Asia/Hong_Kong').add('-10', 'minute')

    const _productSellingPriceObj = {}
    const products = await Product.find({})
    products.forEach(product => {
      _productSellingPriceObj[product._id] = []
    })
    // construct data model tobe injected
    const data = {
      reportType       : 'weekly',
      date             : now.startOf('week').format('YYYY-MM-DD'),
      year             : _.toInteger(now.startOf('week').format('YYYY')),
      month            : _.toInteger(now.startOf('week').format('M')),
      day              : _.toInteger(now.startOf('week').format('D')),
      catSummary       : [],
      quantity         : 0,
      orders           : 0,
      deliveryTypeCtn  : {
        delivery : 0,
        pickup   : 0,
      },
      incompleteOrders : 0,
      cancelledOrders  : 0,
      memberOrders     : 0,
      nonMemberOrders  : 0,
      turnover         : 0,
    }


    // query sales
    const salesInWeek = await Sales.find({
      $and : [
        { reportType : 'daily' },
        { date : { $gte : now.startOf('week').format('YYYY-MM-DD') } },
        { date : { $lte : now.endOf('week').format('YYYY-MM-DD') } }
      ]
    }).sort('date')

    const catItemsCount = {}
    const _data = {}
    salesInWeek.forEach(sales => {
      // pending orders count
      sales.catSummary.forEach(item => {
        if (!catItemsCount[item.category]) catItemsCount[item.category] = { category : item.category, quantity : 0 }
        catItemsCount[item.category].quantity += item.quantity
      })
      data.quantity += sales.quantity
      data.orders += sales.orders

      // delivery type count
      data.deliveryTypeCtn.delivery += sales.deliveryTypeCtn.delivery
      data.deliveryTypeCtn.pickup += sales.deliveryTypeCtn.pickup

      data.incompleteOrders += sales.incompleteOrders
      data.cancelledOrders += sales.cancelledOrders
      data.memberOrders += sales.memberOrders
      data.nonMemberOrders += sales.nonMemberOrders
      data.turnover += sales.turnover


      const skuSellingPrice = sales.skuSellingPrice
      const date = moment(sales.date).startOf('week').format('YYYY-MM-DD')
      if (!_data[date]) _data[date] = _.cloneDeep(_productSellingPriceObj)


      skuSellingPrice.forEach(sku => {
        if (!_data[date][sku.product]) _data[date][sku.product] = []
        if (sku.price) {
          _data[date][sku.product].push({ price : sku.price, quantity : sku.quantity })
        }
      })
    })
    data.catSummary = Object.values(catItemsCount)

    for (let i in _data) {
      const skuSellingPrice = []
      for (let j in _data[i]) {
        const product = j
        const price = _.mean(_data[i][product].filter(item => item.price).map(item => item.price))
        const quantity = _.sumBy(_data[i][product], 'quantity')
        skuSellingPrice.push({ price : price ? price.toFixed(2) : null, quantity, product })
      }
      data.skuSellingPrice = skuSellingPrice
    }

    // import to db
    await Sales.findOneAndUpdate({ date : data.date, reportType : 'weekly' }, { $set : data }, { upsert : true })
    return logger.info(`done weekly sales of ${ data.date }`)
  } catch (e) {
    logger.error(e)
  }
}

const monthlySales = async function (date) {
  try {
    // time now HKT
    const now = date ? moment(date).tz('Asia/Hong_Kong') : moment.tz('Asia/Hong_Kong').add('-10', 'minute')

    const _productSellingPriceObj = {}
    const products = await Product.find({})
    products.forEach(product => {
      _productSellingPriceObj[product._id] = []
    })

    // construct data model tobe injected
    const data = {
      reportType       : 'monthly',
      date             : now.format('YYYY-MM'),
      year             : _.toInteger(now.format('YYYY')),
      month            : _.toInteger(now.format('M')),
      day              : now.endOf('month').format('D'),
      catSummary       : [],
      quantity         : 0,
      orders           : 0,
      deliveryTypeCtn  : {
        delivery : 0,
        pickup   : 0,
      },
      incompleteOrders : 0,
      cancelledOrders  : 0,
      memberOrders     : 0,
      nonMemberOrders  : 0,
      turnover         : 0,
    }


    // query sales
    const salesInMonth = await Sales.find({
      $and : [
        { reportType : 'daily' },
        { date : { $gte : now.startOf('month').format('YYYY-MM-DD') } },
        { date : { $lte : now.endOf('month').format('YYYY-MM-DD') } }
      ]
    }).sort('date')

    const catItemsCount = {}
    const _data = {}
    salesInMonth.forEach(sales => {
      // pending orders count
      sales.catSummary.forEach(item => {
        if (!catItemsCount[item.category]) catItemsCount[item.category] = { category : item.category, quantity : 0 }
        catItemsCount[item.category].quantity += item.quantity
      })
      data.quantity += sales.quantity
      data.orders += sales.orders

      // delivery type count
      data.deliveryTypeCtn.delivery += sales.deliveryTypeCtn.delivery
      data.deliveryTypeCtn.pickup += sales.deliveryTypeCtn.pickup

      data.incompleteOrders += sales.incompleteOrders
      data.cancelledOrders += sales.cancelledOrders
      data.memberOrders += sales.memberOrders
      data.nonMemberOrders += sales.nonMemberOrders
      data.turnover += sales.turnover

      const skuSellingPrice = sales.skuSellingPrice
      const date = moment(sales.date).format('YYYY-MM')
      if (!_data[date]) _data[date] = _.cloneDeep(_productSellingPriceObj)


      skuSellingPrice.forEach(sku => {
        if (!_data[date][sku.product]) _data[date][sku.product] = []
        if (sku.price) {
          _data[date][sku.product].push({ price : sku.price, quantity : sku.quantity })
        }
      })
    })
    data.catSummary = Object.values(catItemsCount)

    for (let i in _data) {
      const skuSellingPrice = []
      for (let j in _data[i]) {
        const product = j
        const price = _.mean(_data[i][product].filter(item => item.price).map(item => item.price))
        const quantity = _.sumBy(_data[i][product], 'quantity')
        skuSellingPrice.push({ price : price ? price.toFixed(2) : null, quantity, product })
      }
      data.skuSellingPrice = skuSellingPrice
    }

    // import to db
    await Sales.findOneAndUpdate({ date : data.date, reportType : 'monthly' }, { $set : data }, { upsert : true })
    return logger.info(`done monthly sales of ${ data.date }`)
  } catch (e) {
    logger.error(e)
  }
}

const yearlySales = async function (date) {
  try {
    // time now HKT
    const now = date ? moment(date).tz('Asia/Hong_Kong') : moment.tz('Asia/Hong_Kong').add('-10', 'minute')

    const _productSellingPriceObj = {}
    const products = await Product.find({})
    products.forEach(product => {
      _productSellingPriceObj[product._id] = []
    })

    // construct data model tobe injected
    const data = {
      reportType       : 'yearly',
      date             : now.format('YYYY'),
      year             : _.toInteger(now.format('YYYY')),
      month            : now.endOf('year').format('M'),
      day              : now.endOf('year').format('D'),
      catSummary       : [],
      quantity         : 0,
      orders           : 0,
      deliveryTypeCtn  : {
        delivery : 0,
        pickup   : 0,
      },
      incompleteOrders : 0,
      cancelledOrders  : 0,
      memberOrders     : 0,
      nonMemberOrders  : 0,
      turnover         : 0,
    }


    // query sales
    const salesInYear = await Sales.find({
      $and : [
        { reportType : 'daily' },
        { date : { $gte : now.startOf('year').format('YYYY-MM-DD') } },
        { date : { $lte : now.endOf('year').format('YYYY-MM-DD') } }
      ]
    }).sort('date')

    const catItemsCount = {}
    const _data = {}
    salesInYear.forEach(sales => {
      // pending orders count
      sales.catSummary.forEach(item => {
        if (!catItemsCount[item.category]) catItemsCount[item.category] = { category : item.category, quantity : 0 }
        catItemsCount[item.category].quantity += item.quantity
      })
      data.quantity += sales.quantity
      data.orders += sales.orders

      // delivery type count
      data.deliveryTypeCtn.delivery += sales.deliveryTypeCtn.delivery
      data.deliveryTypeCtn.pickup += sales.deliveryTypeCtn.pickup

      data.incompleteOrders += sales.incompleteOrders
      data.cancelledOrders += sales.cancelledOrders
      data.memberOrders += sales.memberOrders
      data.nonMemberOrders += sales.nonMemberOrders
      data.turnover += sales.turnover

      const skuSellingPrice = sales.skuSellingPrice
      const date = moment(sales.date).format('YYYY')
      if (!_data[date]) _data[date] = _.cloneDeep(_productSellingPriceObj)


      skuSellingPrice.forEach(sku => {
        if (!_data[date][sku.product]) _data[date][sku.product] = []
        if (sku.price) {
          _data[date][sku.product].push({ price : sku.price, quantity : sku.quantity })
        }
      })
    })
    data.catSummary = Object.values(catItemsCount)

    for (let i in _data) {
      const skuSellingPrice = []
      for (let j in _data[i]) {
        const product = j
        const price = _.mean(_data[i][product].filter(item => item.price).map(item => item.price))
        const quantity = _.sumBy(_data[i][product], 'quantity')
        skuSellingPrice.push({ price : price ? price.toFixed(2) : null, quantity, product })
      }
      data.skuSellingPrice = skuSellingPrice
    }

    // import to db
    await Sales.findOneAndUpdate({ date : data.date, reportType : 'yearly' }, { $set : data }, { upsert : true })
    return logger.info(`done yearly sales of ${ data.date }`)
  } catch (e) {
    logger.error(e)
  }
}

const runAllSalesReportOnce = async function (date) {
  logger.info('running all sales reports [daily, weekly, monthly, yearly] at once.')
  await dailySales(date)
  await Promise.all([weeklySales(date), monthlySales(date), yearlySales(date)])
  return
}

const kolMonthlySales = async function (date) {
  try {
    // time now HKT
    const now = date ? moment(date).tz('Asia/Hong_Kong') : moment.tz('Asia/Hong_Kong').add('-10', 'minute')

    // construct data model tobe injected
    const data = {
      kol              : null,
      kolCode          : null,
      bonus            : 0,
      reportType       : 'monthly',
      ordersRef        : [],
      date             : now.format('YYYY-MM'),
      year             : _.toInteger(now.format('YYYY')),
      month            : _.toInteger(now.format('M')),
      day              : now.endOf('month').format('D'),
      catSummary       : [],
      quantity         : 0,
      orders           : 0,
      incompleteOrders : 0,
      cancelledOrders  : 0,
      memberOrders     : 0,
      nonMemberOrders  : 0,
      turnover         : 0,
    }


    let contracts = await KolContract.find({
      startAt : { $lte : now.clone().toISOString() }, endAt : { $gte : now.clone().toISOString() }, active : true, signed : true
    }).select('code kolUser bonusPercentage rate')

    const codes = _.uniq(_.map(contracts, ({ code }) => code.toString()))
    const kolUsersRate = _.keyBy(contracts, 'kolUser')

    let orders = await Order.find({
      $and : [{ createdAt : { $gte : now.startOf('month').toISOString() } }, { createdAt : { $lt : now.endOf('month').toISOString() } },
        { voucherUsed : { $in : codes } }]
    }).populate([{ path : 'items', populate : { path : 'product' } }, { path : 'voucherUsed', populate : { path : 'kolUser' } }])

    const catItemsCount = {}
    const categories = await Category.find()
    categories.forEach(cat => {
      catItemsCount[cat.id] = {
        category : cat.id,
        quantity : 0
      }
    })

    const kolReports = {}

    for (let i in orders) {
      const order = orders[i]
      const kol = order.voucherUsed.kolUser

      if (!kolReports[kol.id]) kolReports[kol.id] = _.cloneDeep({ ...data, kol : kol.id })

      const report = kolReports[kol.id]

      if (!report.kolCode) report.kolCode = order.voucherUsed._id

      // pending orders count
      if (order.orderStatus === 'pending_payment') report.incompleteOrders += 1

      // cancel orders count
      if (order.orderStatus === 'cancelled') report.cancelledOrders += 1

      if (!report.catItemsCount) report.catItemsCount = _.cloneDeep(catItemsCount)

      if (order.orderStatus === 'confirmed') {
        report.ordersRef.push(order.id)

        // confirm orders count
        report.orders += 1

        report.turnover += order.paidTotal

        if (order.createdBy) {
          // member orders count (confirmed orders)
          report.memberOrders += 1
        } else {
          // non-member orders count (confirmed orders)
          report.nonMemberOrders += 1
        }

        // quantity by category
        order.items.forEach(item => {
          report.quantity += item.quantity
          report.catItemsCount[item.product.category].quantity += item.quantity
        })
      }
    }

    // erase prev records
    // await KolSales.deleteMany({
    //   date : now.clone().format('YYYY-MM'), reportType : 'monthly'
    // })

    for (const i in kolReports) {
      const report = kolReports[i]

      const rate = kolUsersRate[report.kol].rate
      const bonusPercentage = kolUsersRate[report.kol].bonusPercentage
      report.bonus = Math.floor(report.turnover * (1 - rate / 100) * (bonusPercentage / 100))
      report.catSummary = Object.values(report.catItemsCount)

      // special handle for polly
      const isAfterApril2024 = moment(report.date).isAfter(moment.tz('2024-03', 'Asia/Hong_Kong').endOf('month'))
      if (report.kolCode == '6475e7250b2676021244e164' && isAfterApril2024) {
        // secretly -30% for polly
        // console.log('in polly 2024 April or later')
        report.turnover = Math.floor(report.turnover * 0.6)
        report.orders = Math.floor(report.orders * 0.6)
        report.bonus = Math.floor(report.bonus * 0.6)
      }

      //kol total orders
      //*** removed total orders, useless, no bonus is required
      report.totalOrders = 0

      await KolSales.findOneAndUpdate({
        date : report.date, reportType : 'monthly', kol : report.kol
      }, { $set : report }, { upsert : true })
    }

    return logger.info(`done monthly kol sales of ${ data.date }`)

    // import to db
    // await Sales.findOneAndUpdate({ date : data.date, reportType : 'daily' }, { $set : data }, { upsert : true })
    // return logger.info(`done daily sales report of ${ data.date }`)
  } catch (e) {
    logger.error(e)
  }
}

// Top up sales
const dailyTopupSales = async function (date) {
  try {
    // time now HKT
    const now = date ? moment(date).tz('Asia/Hong_Kong') : moment.tz('Asia/Hong_Kong').add('-10', 'minute')

    // construct data model tobe injected\
    const data = {
      reportType       : 'daily',
      date             : now.clone().format('YYYY-MM-DD'), //2000-12-31 // 2000-12
      year             : now.clone().format('YYYY'), //2000
      month            : now.clone().format('M'), //0-12
      day              : now.clone().format('D'), //1-31 for type = daily // 1 for type = monthly
      orders           : 0,
      totalCredits     : 0,
      incompleteOrders : 0,
      cancelledOrders  : 0,
      memberOrders     : 0,
      nonMemberOrders  : 0,
      turnover         : 0,
    }


    // query today orders
    const orders = await TopupOrder.find({
      $and : [{ createdAt : { $gte : now.clone().startOf('day').toISOString() } }, { createdAt : { $lt : now.clone().endOf('day').toISOString() } },
        { 'payment.paymentType' : { $ne : 'admin' } }]
    })

    orders.forEach(order => {
      // pending orders count
      if (order.orderStatus === 'pending_payment') data.incompleteOrders += 1

      // cancel orders count
      if (order.orderStatus === 'cancelled') data.cancelledOrders += 1


      if (order.orderStatus === 'confirmed') {
        // confirm orders count
        data.orders += 1

        // turn over of the day
        data.turnover += order.price

        data.totalCredits += order.topupValue

        if (order.createdBy) {
          // member orders count (confirmed orders)
          data.memberOrders += 1
        }
      }
    })

    // import to db
    await TopupSales.findOneAndUpdate({ date : data.date, reportType : 'daily' }, { $set : data }, { upsert : true })
    return logger.info(`done daily top up sales report of ${ data.date }`)
  } catch (e) {
    logger.error(e)
  }
}

const monthlyTopupSales = async function (date) {
  try {
    // time now HKT
    const now = date ? moment(date).tz('Asia/Hong_Kong') : moment.tz('Asia/Hong_Kong').add('-10', 'minute')

    // construct data model tobe injected
    const data = {
      reportType       : 'monthly',
      date             : now.clone().format('YYYY-MM'),
      year             : now.clone().startOf('month').format('YYYY'),
      month            : now.clone().startOf('month').format('M'),
      day              : now.clone().startOf('month').format('D'),
      orders           : 0,
      totalCredits     : 0,
      incompleteOrders : 0,
      cancelledOrders  : 0,
      memberOrders     : 0,
      nonMemberOrders  : 0,
      turnover         : 0,
    }


    // query sales
    const salesInMonth = await TopupSales.find({
      $and : [
        { reportType : 'daily' },
        { date : { $gte : now.clone().startOf('month').format('YYYY-MM-DD') } },
        { date : { $lte : now.clone().endOf('month').format('YYYY-MM-DD') } }
      ]
    }).sort('date')

    salesInMonth.forEach(sales => {
      // pending orders count
      data.memberOrders += sales.memberOrders
      data.orders += sales.orders
      data.totalCredits += sales.totalCredits
      data.turnover += sales.turnover
      data.incompleteOrders += sales.incompleteOrders
      data.cancelledOrders += sales.cancelledOrders
    })
    // import to db
    await TopupSales.findOneAndUpdate({ date : data.date, reportType : data.reportType }, { $set : data }, { upsert : true })
    return logger.info(`done monthly top up sales of ${ data.date }`)
  } catch (e) {
    logger.error(e)
  }
}

const yearlyTopupSales = async function (date) {
  try {
    // time now HKT
    const now = date ? moment(date).tz('Asia/Hong_Kong') : moment.tz('Asia/Hong_Kong').add('-10', 'minute')

    // construct data model tobe injected
    const data = {
      reportType       : 'yearly',
      date             : now.clone().format('YYYY'),
      year             : now.clone().startOf('year').format('YYYY'),
      month            : now.clone().startOf('year').format('M'),
      day              : now.clone().startOf('year').format('D'),
      orders           : 0,
      totalCredits     : 0,
      incompleteOrders : 0,
      cancelledOrders  : 0,
      memberOrders     : 0,
      nonMemberOrders  : 0,
      turnover         : 0,
    }


    // query sales
    const salesInYear = await TopupSales.find({
      $and : [
        { reportType : 'daily' },
        { date : { $gte : now.clone().startOf('year').format('YYYY-MM-DD') } },
        { date : { $lte : now.clone().endOf('year').format('YYYY-MM-DD') } }
      ]
    }).sort('date')

    salesInYear.forEach(sales => {
      // pending orders count
      data.memberOrders += sales.memberOrders
      data.orders += sales.orders
      data.totalCredits += sales.totalCredits
      data.turnover += sales.turnover
      data.incompleteOrders += sales.incompleteOrders
      data.cancelledOrders += sales.cancelledOrders
    })
    // import to db
    await TopupSales.findOneAndUpdate({ date : data.date, reportType : data.reportType }, { $set : data }, { upsert : true })
    return logger.info(`done yearly top up sales of ${ data.date }`)
  } catch (e) {
    logger.error(e)
  }
}

const runAllTopupSalesReportOnce = async function (date) {
  logger.info('running all sales reports [daily, weekly, monthly, yearly] at once.')
  await dailyTopupSales(date)
  await Promise.all([monthlyTopupSales(date), yearlyTopupSales(date)])
  return
}

module.exports = {
  dailySales,
  weeklySales,
  monthlySales,
  yearlySales,
  runAllSalesReportOnce,
  kolMonthlySales,
  orderStatusCheck,
  topupOrderStatusCheck,
  dailyTopupSales,
  monthlyTopupSales,
  yearlyTopupSales,
  runAllTopupSalesReportOnce,
  expirePendingOrders
}
