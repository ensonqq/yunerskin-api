const crypto = require("crypto");
const config = require("../config/config");
const axios = require("axios");
const qs = require("qs");

const APP_CODE = "997C34C89A614A739071D918C0FEFB05";
const CLIENT_KEY = "545C50F967E640A783568551ED55B9D6";
const BASE_URL = "https://openapi-hk.qfapi.com"; // use prod URL for live


function generateCheckoutURL (order, options) {
  const params = {
    appcode      : APP_CODE,
    goods_name   : "Yunerksin Product",
    out_trade_no : order.orderNumber, // must be unique per transaction
    paysource    : "remotepay_checkout",  // must end with _checkout
    return_url   : `${ config.frontendHost }/?action=${ options.action }&paymentType=${ order.payment.paymentType }&status=success&orderNumber=${ order.orderNumber }&accessCode=${ order.accessCode }`, //frontend submit
    failed_url   : `${ config.frontendHost }/?action=${ options.action }&paymentType=${ order.payment.paymentType }&status=failed&orderNumber=${ order.orderNumber }&accessCode=${ order.accessCode }`, //frontend submit
    cancel_url   : `${ config.frontendHost }/?action=${ options.action }&paymentType=${ order.payment.paymentType }&status=cancelled&orderNumber=${ order.orderNumber }&accessCode=${ order.accessCode }`, //frontend submit
    notify_url   : `${ config.frontendHost }`,
    sign_type    : "SHA256",
    txamt        : order.paidTotal * 100,       // in cents, e.g. 1000 = HKD 10.00
    txcurrcd     : "HKD",
    txdtm        : new Date().toISOString().replace("T", " ").slice(0, 19) // YYYY-MM-DD HH:mm:ss
  };

  // 1. Sort keys alphabetically and build query string
  const sorted = Object.keys(params)
                       .sort()
                       .map(k => `${ k }=${ params[k] }`)
                       .join("&");

  // 2. Generate SHA256 signature (append client_key at the end)
  const sign = crypto
  .createHash("sha256")
  .update(sorted + CLIENT_KEY)
  .digest("hex");

  // 3. Build the checkout URL and return
  const urlParams = Object.keys(params).sort()
                          .map(k => `${ k }=${ encodeURIComponent(params[k]) }`).join("&");
  return `${ BASE_URL }/checkstand/#/?${ urlParams }&sign=${ sign }`;
}


async function transactionEnquiry (order) {
  let status = "fail";
  try {
    const payload = { out_trade_no : order.orderNumber };

    // Build signature
    const ordered = {};
    Object.keys(payload).sort().forEach(k => ordered[k] = payload[k]);

    // console.log(ordered)
    const str = Object.keys(ordered)
                      .map(k => `${ k }=${ ordered[k] }`)
                      .join("&") + CLIENT_KEY;

    const sign = crypto.createHash("md5")
                       .update(str)
                       .digest("hex")
                       .toUpperCase();


    const query = await axios.post(
      BASE_URL + "/trade/v1/query",
      qs.stringify(payload),
      {
        headers : {
          "Content-Type" : "application/x-www-form-urlencoded",
          "X-QF-APPCODE" : APP_CODE,
          "X-QF-SIGN"    : sign
        }
      }
    );

    if (query.data && query.data.respcd === "0000") {
      const result = query.data.data;
      for (let record of result) {
        if (record.respcd === "0000" && (record.cancel === "5" || record.cancel === "0")) {
          status = "success";
          break;
        }
      }
    } else {
      throw new Error("No data returned from QFPay transaction enquiry");
    }
  } catch (e) {
    console.error(e);
    status = "fail";
  }
  return status;
}


module.exports = {
  generateCheckoutURL,
  transactionEnquiry
};
