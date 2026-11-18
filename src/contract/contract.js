const moment = require("moment-timezone");
const { Order, KolContract } = require("../models");
const logger = require("../config/logger");
const { voucherService } = require("../services");
const momentTz = require("moment-timezone");


const kolContractRenewal = async function () {
  try {
    // time now HKT
    const now = momentTz().tz('Asia/Hong_Kong')
    const nextContracts = await KolContract.find({
      $or : [
        {
          startAt : { $gt : now.clone().toISOString() },
          active  : true
        },
        {
          startAt : { $lt : now.clone().toISOString() },
          active  : true,
          signed  : false
        }
      ]
    }).distinct('kolUser')


    // kol with next contracts is excluded
    const kolsWithNextContract = nextContracts.map(item => item.toString())

    const activeContracts = await KolContract.find({
      startAt : { $lte : now.clone().toISOString() },
      endAt   : { $gte : now.clone().toISOString() },
      active  : true,
      signed  : true,
      kolUser : { $nin : kolsWithNextContract }
    }).populate('kolUser code')

    for (let i in activeContracts) {
      const currentContract = activeContracts[i]
      // console.log(currentContract.kolUser.name,
      //   currentContract.code.code, momentTz(currentContract.startAt).tz('Asia/Hong_Kong')
      //                                                               .format('YYYY/MM/DD') + ' - ' + momentTz(currentContract.endAt)
      // .tz('Asia/Hong_Kong').format('YYYY/MM/DD'))
      if (moment(currentContract.endAt).diff(now, 'days') <= 30) {
        // 30days before current contract ends
        const currentSales = await Order.aggregate([
          {
            $match : {
              createdAt   : {
                $gte : currentContract.startAt,
                $lte : currentContract.endAt
              },
              voucherUsed : currentContract.code._id,
              orderStatus : 'confirmed'
            }
          },
          { $group : { _id : null, total : { $sum : "$paidTotal" } } }
        ])
        if (currentSales[0] && currentSales[0].total >= 10000) {
          // if kol performing sales >= 10000 in current contract period
          // create next contract and wait for sign
          // special handle for 2024-02
          const startAt = now.clone().add(1, 'months').startOf('month').startOf('day')
          const endAt = startAt.clone().add(6, 'months').add(-1, 'days').endOf('day')
          const contract = await voucherService.createKolContract({
            startAt : startAt.toISOString(),
            endAt   : endAt.toISOString(),
            code    : currentContract.code._id,
            kolUser : currentContract.kolUser._id,
            active  : true,
            signed  : false //important
          })
          //  TODO: send renewal contract notification email
        } else {
          // did not reach 10k turnover, no action needed
          // logger.info(currentContract.kolUser.name + ', ' + currentContract.code.code + ', wait till 30days before contract end.')
        }
      } else {
        // wait till 30days before contract end.
        // logger.info(currentContract.kolUser.name + ', ' + currentContract.code.code + ', wait till 30days before contract end.')
      }
    }
    return logger.info(`done KOL contract renewable of ${ now.clone().format('YYYY-MM') }`)
  } catch (e) {
    logger.error(e)
  }
}

module.exports = {
  kolContractRenewal
}
