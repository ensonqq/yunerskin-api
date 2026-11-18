const express = require('express');
const catchAsync = require("../../utils/catchAsync");
const bizSdk = require('facebook-nodejs-business-sdk');
const router = express.Router();
const config = require('../../config/config');

router.route('/')
      .get(catchAsync(async (req, res) => {
          const ip = req.headers['cf-connecting-ip'] || req.connection.remoteAddress
          const useragent = req.headers['user-agent']

          return res.send({ ip, useragent })
        })
      )


router.route('/pixel')
      .get(catchAsync(async (req, res) => {

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


          const userData = (new UserData()).setEmails(['ensonq@yunerksin.com.hk'])
                                           .setPhones(['90784004'])
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
                                               .setValue(123.45);

          const serverEvent = (new ServerEvent()).setEventName('Purchase')
                                                 .setEventTime(current_timestamp)
                                                 .setUserData(userData)
                                                 .setCustomData(customData)
                                                 .setEventSourceUrl(`${ req.headers['referer'] }`)
                                                 .setActionSource('website');

          const eventsData = [serverEvent];
          const eventRequest = (new EventRequest(access_token, pixel_id)).setEvents(eventsData);

          return res.send(eventsData)

          return eventRequest.execute().then(result => {
            return res.send(result)
          }).catch(error => {
            return res.send(error)
          })
        })
      )

module.exports = router;
