const { orderService, voucherService, topupService, userService } = require("../services");
const { User, PrizeRecord } = require("../models");
const { sendReceipt, sendTopupOrderReceipt } = require("../services/email.service");
const bizSdk = require("facebook-nodejs-business-sdk");
const config = require("../config/config");

const statistics = async (order, req) => {
  try {
    if (!order.statsComputed) {
      await orderService.updateOrderById(order.id, { statsComputed : true })
      await PrizeRecord.findOneAndDelete({ createdBy : order.createdBy })
      // fire pixel conversion api event: "Purchase"

      // update voucher usage
      // console.log(order)
      if (order.voucherUsed) {
        await voucherService.useVoucher(order.voucherUsed.id, order.paidTotal)
      }

      if (order.createdBy) {
        const userStatsInc = config.features.creditsEnabled ? {
          "credits" : order.creditsGained + order.creditsUsed * -1,
          totalOrders : 1,
          totalSpent  : order.paidTotal
        } : {
          totalOrders : 1,
          totalSpent  : order.paidTotal
        };
        const updatedUser = await User.findByIdAndUpdate(order.createdBy, {
          "$inc" : userStatsInc
        }, { new : true })

        if (config.features.creditsEnabled && updatedUser.credits < 0 && order.creditsUsed > 0) {
          // await User.findByIdAndUpdate(order.createdBy, { credits : 0 }, { new : true })
          await orderService.updateOrderById(order.id, { flag : true })
        }

        // vipTier: gold
        if (updatedUser.totalSpent >= 3888 && updatedUser.vipTier !== 'diamond') {
          await User.findByIdAndUpdate(order.createdBy, { vipTier : 'diamond' }, { new : true })
        } else if (updatedUser.totalSpent >= 888 && updatedUser.vipTier !== 'gold' && updatedUser.vipTier !== 'diamond') {
          await User.findByIdAndUpdate(order.createdBy, { vipTier : 'gold' }, { new : true })
        }
      }
      sendReceipt(order).catch(error => {
        console.log(error)
      })
    }
  } catch (e) {
    console.log(e)
  }
  return true
}

const topupStatistics = async (order) => {
  try {
    if (!order.statsComputed) {
      // set computed
      await topupService.updateTopupOrderById(order.id, { statsComputed : true })

      const userStatsInc = config.features.creditsEnabled ? {
        "credits"  : order.topupValue,
        totalSpent : order.price
      } : {
        totalSpent : order.price
      };
      const updatedUser = await User.findByIdAndUpdate(order.createdBy, {
        "$inc" : userStatsInc
      }, { new : true })

      // vipTier: gold
      if (updatedUser.totalSpent >= 6000 && updatedUser.vipTier !== 'diamond') {
        await User.findByIdAndUpdate(order.createdBy, { vipTier : 'diamond' }, { new : true })
      } else if (updatedUser.totalSpent >= 3000 && updatedUser.vipTier !== 'gold' && updatedUser.vipTier !== 'diamond') {
        await User.findByIdAndUpdate(order.createdBy, { vipTier : 'gold' }, { new : true })
      }

      sendTopupOrderReceipt(order).catch(error => {
        console.log(error)
      })
    }
  } catch (e) {
    console.log(e)
  }
  return true
}

const firePixelEvent = async (order, req, event) => {
  try {
    if (config.env !== 'production') return
    const CustomData = bizSdk.CustomData;
    const EventRequest = bizSdk.EventRequest;
    const UserData = bizSdk.UserData;
    const ServerEvent = bizSdk.ServerEvent;
    const access_token = 'ADD_YOUR_TOKEN_HERE';
    const pixel_id = '1713392268893342';
    const api = bizSdk.FacebookAdsApi.init(access_token);

    const ip = req.headers['cf-connecting-ip'] || req.connection.remoteAddress
    const useragent = req.headers['user-agent']


    let current_timestamp = Math.floor(new Date() / 1000);


    const userData = (new UserData()).setEmails([order.email])
                                     .setPhones([order.phone])
                                     .setClientIpAddress(ip)
                                     .setClientUserAgent(useragent)

    const fbp = req.headers['fbp']
    const fbc = req.headers['fbc']
    if (fbp !== 'undefined') {
      userData.setFbp(fbp)
    }
    if (fbc !== 'undefined') {
      userData.setFbc(fbc)
    }

    const customData = (new CustomData()).setCurrency('hkd')
                                         .setValue(order.paidTotal);

    const serverEvent = (new ServerEvent()).setEventName(event)
                                           .setEventTime(current_timestamp)
                                           .setUserData(userData)
                                           .setCustomData(customData)
                                           .setEventSourceUrl(`${ req.headers['referer'] }`)
                                           .setActionSource('website');

    const eventsData = [serverEvent];
    const eventRequest = (new EventRequest(access_token, pixel_id)).setEvents(eventsData);
    // console.log(eventsData)
    return eventRequest.execute()
  } catch (e) {
    return false
  }
}

module.exports = {
  statistics,
  topupStatistics,
  firePixelEvent
}
