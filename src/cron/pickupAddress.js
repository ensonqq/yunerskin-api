const CronJob = require("cron").CronJob;
const logger = require("../config/logger");
const { kolContractRenewal } = require("../contract/contract");

const moment = require("moment-timezone");
const { Order, KolContract, PickUpAddress, User } = require("../models");
const { voucherService } = require("../services");
const momentTz = require("moment-timezone");
const axios = require("axios");


const pickupAddressesCronJobs = function() {
  logger.info("Pickup addresses cron jobs started.");

  const sfPickUpAddressCron = new CronJob("0 0 0 * * *", async function() {
      // const sfPickUpAddressCron = new CronJob("*/5 * * * * *", async function() {
      try {
        // time now HKT
        // dev
        // const API_KEY = '2B4E63DE8964CD9AF74A98DFA261C'
        // const domain = 'https://hksfaddsit.sf-express.com'
        // prod
        const now = moment();
        const API_KEY = "9ZAIMEHKA3HNK0RRTVGYHEVXLWOQK";
        const domain = "http://hksfadd.sf-express.com";
        const loginUrl = domain + "/api/address_api/login";
        const typeIdUrl = domain + "/api/address_api/serviceType";
        const pickupListUrl = domain + "/api/address_api/netCodeDetails?lang=tc&isColdChain=1";
        const pickupListUrlEn = domain + "/api/address_api/netCodeDetails?lang=en&isColdChain=1";
        const login = await axios.post(loginUrl, {}, { headers : { "api-key" : API_KEY } });
        if (login && login.data) {
          const jwt = login.data.data;

          //get type service id
          const serviceTypes = await axios.get(typeIdUrl, { headers : { "Authorization" : `Bearer ${ jwt }` } });
          let sfAddresses = [];
          let sfAddressesEn = [];
          if (serviceTypes.data) {
            const types = serviceTypes.data.data.map(item => item.id);

            //TC
            const promises = types.map(id => {
              const url = pickupListUrl + "&typeId=" + id;
              return axios.get(url, { headers : { "Authorization" : `Bearer ${ jwt }` } });
            });
            const request = await Promise.all(promises);
            request.forEach(result => {
              if (result && result.data) {
                sfAddresses = sfAddresses.concat(result.data.data);
              }
            });

            //EN
            const promisesEn = types.map(id => {
              const url = pickupListUrlEn + "&typeId=" + id;
              return axios.get(url, { headers : { "Authorization" : `Bearer ${ jwt }` } });
            });
            const requestEn = await Promise.all(promisesEn);
            requestEn.forEach(result => {
              if (result && result.data) {
                sfAddressesEn = sfAddressesEn.concat(result.data.data);
              }
            });
          }


          // sfAddresses = sfAddresses.filter(address => address.frozen && address.selfPickUp && address.coldChain)
          sfAddresses = sfAddresses.filter(address => address.frozen && address.chilled && address.selfPickUp && address.airConditioned && address.coldChain && address.serviceCode);

          logger.info(`${ sfAddresses.length } SF pick address will be imported.`);
          const addresses = [];

          addresses.push(
            {
              "code"           : "0000",
              "longitude"      : "114.25683412869364",
              "latitude"       : "22.322452185970874",
              "area"           : "nt",
              "areaTc"         : "新界",
              "district"       : "西貢區",
              "subDistrict"    : "將軍澳",
              "fullAddress"    : "將軍澳新都城3期,L2 236舖(都會豪庭停車場）",
              "fullAddressEn"  : "Shop 236, Level 2, Metro City Phase III (The Metropolis), Tseung Kwan O, New Territories(Metropolis Car Park)",
              "shortAddress"   : "將軍澳店自取",
              "shortAddressEn" : "Tseung Kwan O pick up store",
              "workingHour"    : "營業時間(週一至週日): 09:00-19:30",
              "workingHourEn"  : "Business hours(Mon-Sun):09:00-19:30"
            },
            {
              "code"           : "0000",
              "longitude"      : "114.21268366133245",
              "latitude"       : "22.285123671277287",
              "area"           : "hk",
              "areaTc"         : "香港",
              "district"       : "東區",
              "subDistrict"    : "鰂魚涌",
              "fullAddress"    : "香港鰂魚涌惠安苑,華蘭路2號LG2號舖",
              "fullAddressEn"  : "Shop LG2, Westlands Gardens, 2 Westlands Road, Quarry Bay, Hong Kong.",
              "shortAddress"   : "太古店自取",
              "shortAddressEn" : "Taikoo pick up store",
              "workingHour"    : "營業時間(週一至週日): 09:00-19:30",
              "workingHourEn"  : "Business hours(Mon-Sun): 09:00-19:30"
            },
            {
              "code"           : "0000",
              "longitude"      : "114.02722709985622",
              "latitude"       : "22.445204313363078",
              "area"           : "hk",
              "areaTc"         : "新界",
              "district"       : "元朗區",
              "subDistrict"    : "元朗",
              "fullAddress"    : "香港元朗壽富街2大橋街市地下M11,M18,M19 號舖",
              "fullAddressEn"  : "Shops M11, M18, and M19, G/F, Tai Kiu Market, 2 Sau Fu Street, Yuen Long, Hong Kong",
              "shortAddress"   : "元朗店自取",
              "shortAddressEn" : "Yuen Long pick up store",
              "workingHour"    : "營業時間(週一至週日): 09:00-19:30",
              "workingHourEn"  : "Business hours(Mon-Sun): 09:00-19:30"
            }
          );
          if (sfAddresses.length) {
            const areas = { "香港島" : "hk", "九龍" : "kln", "新界" : "nt" };
            for (let i in sfAddresses) {
              const address = sfAddresses[i];
              const fullAddress = address.serviceAddr.split("^")[0];
              const code = address.serviceCode;
              const shortAddress = address.serviceName;
              const workingHour = address.serviceTime;
              const longitude = address.longitude;
              const latitude = address.latitude;
              const area = areas[address.region];
              const areaTc = address.region;
              const district = address.district;
              const subDistrict = address.area;
              addresses.push({ fullAddress, code, shortAddress, workingHour, longitude, latitude, area, areaTc, district, subDistrict });
            }
            //clear all pick up addresses
            await PickUpAddress.deleteMany({});
            //insert pickup addresses
            await PickUpAddress.insertMany(addresses);


            //find expired/invalid pickup addresses stored in user profile
            const codes = addresses.map(item => item.code);
            const existingCodes = await User.find().distinct("pickupAddresses.code").lean();

            const diff = existingCodes.filter(e => !codes.includes(e));

            // remove affected user pickup addresses
            for (let i in diff) {
              const code = diff[i];
              await User.updateMany({ "pickupAddresses.code" : code }, {
                $pull : {
                  pickupAddresses : { code : code }
                }
              });
            }
          }

          //update sf address en
          if (sfAddressesEn.length) {
            for (let i in sfAddressesEn) {
              const address = sfAddressesEn[i];
              const code = address.serviceCode;
              const fullAddressEn = address.serviceAddr.split("^")[0];
              const shortAddressEn = address.serviceName;
              const workingHourEn = address.serviceTime;
              await PickUpAddress.findOneAndUpdate({ code }, { $set : { fullAddressEn, shortAddressEn, workingHourEn } });
            }
          }
        }


        return logger.info(`done Pickup addresses at ${ now.clone().format("YYYY-MM-DD HH:mm:ss") }`);
      } catch (e) {
        if (e.response && e.response.data) {
          logger.error(JSON.stringify(e.response.data));
        } else {
          logger.error(e);
        }
      }
    }
  );
  // const sfPickUpAddressCron = new CronJob('*/2 * * * * *', kolContractRenewal)

  // sales
  sfPickUpAddressCron.start();
};


module.exports = {
  pickupAddressesCronJobs
};
