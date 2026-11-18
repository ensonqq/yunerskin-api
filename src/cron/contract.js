const CronJob = require('cron').CronJob
const logger = require('../config/logger');
const { kolContractRenewal } = require('../contract/contract')

const contractCronJobs = function () {
  // logger.info('Contract cron jobs started.')

  // kol contract renewal every day
  // const kolContractCron = new CronJob('0 0 0 * * *', kolContractRenewal)
  // const kolContractCron = new CronJob('*/2 * * * * *', kolContractRenewal)

  // sales
  // kolContractCron.start()
}


module.exports = {
  contractCronJobs,
}
