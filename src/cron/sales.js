const CronJob = require('cron').CronJob
const logger = require('../config/logger');
const {
  dailySales, weeklySales, monthlySales, yearlySales, kolMonthlySales, orderStatusCheck, topupOrderStatusCheck, dailyTopupSales,
  monthlyTopupSales, yearlyTopupSales, expirePendingOrders
} = require('../report/report')

const salesCronJobs = function () {
  logger.info('Sales cron jobs started.')

  //past 10 to 5 minute incomplete orders, check payment status, work around payment status fixing for network issue between client, Optmeal & payment
  // gateway
  const orderStatus = new CronJob('*/20 * * * * *', orderStatusCheck)

  //expired pending orders
  // const expireOldOrders = new CronJob('*/20 * * * * *', expirePendingOrders)

  // gateway
  const topupOrderStatus = new CronJob('*/20 * * * * *', topupOrderStatusCheck)

  //daily sales statistics every 2 minutes, this will update 1 day only
  const dailyCron = new CronJob('*/2 * * * *', dailySales)
  // const dailyCron = new CronJob('*/5 * * * * *', dailySales)

  //weekly sales every 5 minutes, bases on daily sales
  const weeklyCron = new CronJob('*/5 * * * *', weeklySales)

  //monthly sales every 10 minutes, bases on daily sales
  const monthlyCron = new CronJob('*/10 * * * *', monthlySales)

  //monthly kol sales every 10 minutes, bases on daily sales
  const kolMonthlyCron = new CronJob('*/30 * * * *', kolMonthlySales)

  //yearly sales every 30 minutes, based on daily sales
  const yearlyCron = new CronJob('*/30 * * * *', yearlySales)

  //daily top up sales statistics every 2 minutes, this will update 1 day only
  const dailyTopupCron = new CronJob('*/2 * * * *', dailyTopupSales)

  //monthly top up sales every 10 minutes, bases on daily sales
  const monthlyTopupCron = new CronJob('*/10 * * * *', monthlyTopupSales)

  //yearly top up sales every 30 minutes, based on daily sales
  const yearlyTopupCron = new CronJob('*/30 * * * *', yearlyTopupSales)

  // sales
  dailyCron.start()
  weeklyCron.start()
  monthlyCron.start()
  yearlyCron.start()

  // top up sales
  dailyTopupCron.start()
  monthlyTopupCron.start()
  yearlyTopupCron.start()

  // kol sales
  kolMonthlyCron.start()

  // 30 min ago - 1 min ago order status checking
  orderStatus.start()

  // 60 min ago - 30 min ago order status checking
  // expireOldOrders.start()

  // 30 min ago - 1 min ago top up order status checking
  topupOrderStatus.start()
}


module.exports = {
  salesCronJobs,
}
