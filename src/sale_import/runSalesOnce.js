const dotenv = require('dotenv');
const mongoose = require('mongoose');
const moment = require("moment-timezone");
const _ = require("lodash");
const { Order, Category, Sales } = require("../models");
const path = require("path");
const old_data = require('./old_report_json.json')

dotenv.config({ path : path.join(__dirname, '../../.env') });

mongoose.connect(process.env.MONGODB_URL, {
  useCreateIndex     : true,
  useNewUrlParser    : true,
  useUnifiedTopology : true,
  useFindAndModify   : false
}).then(async () => {
  console.info('Connected to MongoDB');

  /**
   * init daily sales (new db)
   */
  await (async function () {
      console.log('*****init daily sales (new db)*****')

      const days = {}
      // query today orders
      const orders = await Order.find().populate([{ path : 'items', populate : { path : 'product' } }])

      const catItemsCountByDate = {}
      const catItemsCount = {}
      const categories = await Category.find()
      categories.forEach(cat => {
        catItemsCount[cat.id] = {
          category : cat.id,
          quantity : 0
        }
      })

      orders.forEach(order => {
          // time now HKT
          const orderTime = moment(order.createdAt).tz('Asia/Hong_Kong')
          const date = orderTime.format('YYYY-MM-DD')
          if (!catItemsCountByDate[date]) catItemsCountByDate[date] = _.cloneDeep(catItemsCount)
          if (!days[date]) {
            days[date] = {
              reportType       : 'daily',
              date             : orderTime.format('YYYY-MM-DD'),
              year             : _.toInteger(orderTime.format('YYYY')),
              month            : _.toInteger(orderTime.format('M')),
              day              : _.toInteger(orderTime.format('D')),
              catSummary       : [],
              quantity         : 0,
              orders           : 0,
              incompleteOrders : 0,
              cancelledOrders  : 0,
              memberOrders     : 0,
              nonMemberOrders  : 0,
              turnover         : 0,
            }
          }

          const dateData = days[date]
          // construct data model tobe injected
          // pending orders count
          if (order.orderStatus === 'pending_payment') dateData.incompleteOrders += 1

          // cancel orders count
          if (order.orderStatus === 'cancelled') dateData.cancelledOrders += 1


          if (order.orderStatus === 'confirmed') {
            // confirm orders count
            dateData.orders += 1

            // turn over of the day
            dateData.turnover += order.paidTotal

            if (order.createdBy) {
              // member orders count (confirmed orders)
              dateData.memberOrders += 1
            } else {
              // non-member orders count (confirmed orders)
              dateData.nonMemberOrders += 1
            }

            // quantity by category
            order.items.forEach(item => {
              dateData.quantity += item.quantity
              catItemsCountByDate[date][item.product.category].quantity += item.quantity
            })
          }
          dateData.catSummary = Object.values(catItemsCountByDate[date])
          // import to db
        }
      )

      for (let date in days) {
        await Sales.findOneAndUpdate({ date, reportType : 'daily' }, { $set : days[date] }, { upsert : true })
      }

      console.log('*****init daily sales (new db)*****')
    }
  )()


  /**
   * init daily sales (old db)
   */
  await (async function () {
    console.log('*****init daily sales (old db)*****')
    for (let i in old_data) {
      const data = old_data[i]


      //TODO: special handle for 2022-12-05
      const specific_date = '2022-12-05'
      if (data.date === specific_date) {
        const Sales20221205 = await Sales.findOne({ date : specific_date, reportType : 'daily' })
        if (Sales20221205) {
          data.quantity = _.toInteger(data.quantity)
          data.orders = _.toInteger(data.orders)
          data.incompleteOrders = _.toInteger(data.incompleteOrders)
          data.cancelledOrders = _.toInteger(data.cancelledOrders)
          data.memberOrders = _.toInteger(data.memberOrders)
          data.nonMemberOrders = _.toInteger(data.nonMemberOrders)
          data.turnover = _.toInteger(data.turnover)

          data.quantity += Sales20221205.quantity
          data.orders += Sales20221205.orders
          data.incompleteOrders += Sales20221205.incompleteOrders
          data.cancelledOrders += Sales20221205.cancelledOrders
          data.memberOrders += Sales20221205.memberOrders
          data.nonMemberOrders += Sales20221205.nonMemberOrders
          data.turnover += Sales20221205.turnover

          Sales20221205.catSummary.forEach(cat20221205 => {
            const indexOfCatInReport = _.findIndex(data.catSummary, (cat) => {
              return cat.category === cat20221205.category.toString();
            }, 0)
            if (indexOfCatInReport > -1) data.catSummary[indexOfCatInReport].quantity += cat20221205.quantity
          })
        }
      }
      //end special handle

      await Sales.findOneAndUpdate({ date : data.date, reportType : 'daily' }, { $set : data }, { upsert : true })

    }
    console.log('*****init daily sales (old db)*****')
  })()

  /**
   * init monthly and year sales (all)
   */
  await (async function () {
    console.log('*****init weekly, monthly and year sales (all)*****')
    const weeks = []
    const months = []
    const years = []
    const sales = await Sales.find({ reportType : 'daily' }).sort('date')
    sales.forEach(item => {
      const weekOfCurrentItem = moment(item.date).startOf('week').format('YYYY-MM-DD')
      const monthOfCurrentItem = moment(item.date).format('YYYY-MM')
      const yearOfCurrentItem = moment(item.date).format('YYYY')

      /**
       * weekly
       */
      let weekIndex = _.findIndex(weeks, (month) => {
        return month.date === weekOfCurrentItem && month.reportType === 'weekly';
      }, 0);
      if (weekIndex < 0) {
        weekIndex = weeks.push({
          reportType       : 'weekly',
          date             : moment(item.date).startOf('week').format('YYYY-MM-DD'),
          year             : _.toInteger(moment(item.date).startOf('week').format('YYYY')),
          month            : _.toInteger(moment(item.date).startOf('week').format('M')),
          day              : _.toInteger(moment(item.date).startOf('week').format('D')),
          catSummary       : [
            { category : "638cd26070b2e30219b70c3d", quantity : 0 },
            { category : "638cd28670b2e30219b70c4b", quantity : 0 },
            { category : "638cd2a370b2e30219b70c56", quantity : 0 }
          ],
          quantity         : 0,
          orders           : 0,
          incompleteOrders : 0,
          cancelledOrders  : 0,
          memberOrders     : 0,
          nonMemberOrders  : 0,
          turnover         : 0,
        }) - 1
      }

      weeks[weekIndex].quantity += item.quantity
      weeks[weekIndex].orders += item.orders
      weeks[weekIndex].incompleteOrders += item.incompleteOrders
      weeks[weekIndex].cancelledOrders += item.cancelledOrders
      weeks[weekIndex].memberOrders += item.memberOrders
      weeks[weekIndex].nonMemberOrders += item.nonMemberOrders
      weeks[weekIndex].turnover += item.turnover
      item.catSummary.forEach(cat => {
        const weekCatIndex = _.findIndex(weeks[weekIndex].catSummary, weekCat => {
          return weekCat.category == cat.category
        })

        if (weekCatIndex > -1) {
          weeks[weekIndex].catSummary[weekCatIndex].quantity += cat.quantity
        }
      })


      /**
       * monthly
       */
      let monthIndex = _.findIndex(months, (month) => {
        return month.date === monthOfCurrentItem && month.reportType === 'monthly';
      }, 0);


      if (monthIndex < 0) {
        monthIndex = months.push({
          reportType       : 'monthly',
          date             : moment(item.date).format('YYYY-MM'),
          year             : _.toInteger(moment(item.date).format('YYYY')),
          month            : _.toInteger(moment(item.date).format('M')),
          day              : _.toInteger(moment(item.date).endOf('month').format('D')),
          catSummary       : [
            { category : "638cd26070b2e30219b70c3d", quantity : 0 },
            { category : "638cd28670b2e30219b70c4b", quantity : 0 },
            { category : "638cd2a370b2e30219b70c56", quantity : 0 }
          ],
          quantity         : 0,
          orders           : 0,
          incompleteOrders : 0,
          cancelledOrders  : 0,
          memberOrders     : 0,
          nonMemberOrders  : 0,
          turnover         : 0,
        }) - 1
      }

      // add stats to month
      months[monthIndex].quantity += item.quantity
      months[monthIndex].orders += item.orders
      months[monthIndex].incompleteOrders += item.incompleteOrders
      months[monthIndex].cancelledOrders += item.cancelledOrders
      months[monthIndex].memberOrders += item.memberOrders
      months[monthIndex].nonMemberOrders += item.nonMemberOrders
      months[monthIndex].turnover += item.turnover
      item.catSummary.forEach(cat => {
        const monCatIndex = _.findIndex(months[monthIndex].catSummary, montCat => {
          return montCat.category == cat.category
        })
        if (monCatIndex > -1) {
          months[monthIndex].catSummary[monCatIndex].quantity += cat.quantity
        }
      })

      /**
       * yearly
       */
      let yearIndex = _.findIndex(years, (year) => {
        return year.date === yearOfCurrentItem && year.reportType === 'yearly';
      }, 0);
      if (yearIndex < 0) {
        yearIndex = years.push({
          reportType       : 'yearly',
          date             : moment(item.date).format('YYYY'),
          year             : _.toInteger(moment(item.date).format('YYYY')),
          month            : _.toInteger(moment(item.date).endOf('year').format('M')),
          day              : _.toInteger(moment(item.date).endOf('year').format('D')),
          catSummary       : [{ "category" : "638cd26070b2e30219b70c3d", "quantity" : 0 },
            { "category" : "638cd28670b2e30219b70c4b", "quantity" : 0 },
            { "category" : "638cd2a370b2e30219b70c56", "quantity" : 0 }],
          quantity         : 0,
          orders           : 0,
          incompleteOrders : 0,
          cancelledOrders  : 0,
          memberOrders     : 0,
          nonMemberOrders  : 0,
          turnover         : 0,
        }) - 1
      }

      // add stats to year
      years[yearIndex].quantity += item.quantity
      years[yearIndex].orders += item.orders
      years[yearIndex].incompleteOrders += item.incompleteOrders
      years[yearIndex].cancelledOrders += item.cancelledOrders
      years[yearIndex].memberOrders += item.memberOrders
      years[yearIndex].nonMemberOrders += item.nonMemberOrders
      years[yearIndex].turnover += item.turnover

      item.catSummary.forEach(cat => {
        const yearCatIndex = _.findIndex(years[yearIndex].catSummary, yearCat => {
          return yearCat.category == cat.category
        })
        if (yearCatIndex > -1) {
          years[yearIndex].catSummary[yearCatIndex].quantity += cat.quantity
        }
      })
    })

    for (let i in weeks) {
      const data = weeks[i]
      console.log('importing weeks data ' + data.date)
      await Sales.findOneAndUpdate({ date : data.date, reportType : 'weekly' }, { $set : data }, { upsert : true })
    }

    for (let i in months) {
      const data = months[i]
      console.log('importing monthly data ' + data.date)
      await Sales.findOneAndUpdate({ date : data.date, reportType : 'monthly' }, { $set : data }, { upsert : true })
    }

    for (let i in years) {
      const data = years[i]
      console.log('importing yearly data ' + data.date)
      await Sales.findOneAndUpdate({ date : data.date, reportType : 'yearly' }, { $set : data }, { upsert : true })
    }

    console.log('*****done weekly, monthly and year sales (all)*****')
  })()
  await mongoose.disconnect()
  process.exit()
});
