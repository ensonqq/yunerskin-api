const SHA1 = require('crypto-js/sha1')
const config = require('../config/config')

const currencyCode = '344' // HKD
const merchantId = config.payment.asiapayMerchantId
const secretHash = config.payment.asiapaySecureHashSecret
const paymentType = 'N' //N = normal, H = hold
exports.generateSecureHash = async (merchantReference, amount) => {
  return await new Promise((resolve, reject) => {
    if (!merchantReference || !amount) {
      reject('empty parameters, [merchantReference | amount | paymentType]')
    } else {
      try {
        let dataString = merchantId + '|' + merchantReference + '|' + currencyCode + '|' + amount + '|' + paymentType + '|' + secretHash
        resolve(SHA1(dataString).toString())
      } catch (error) {
        reject(error)
      }
    }
  })
}

//TODO verify SecureHash
exports.verifySecureHash = async (src, prc, successcode, merchantReference, payDollarReference, amount, payerAuthenticationStatus, secureHashFromDataFeed) => {
  return await new Promise((resolve, reject) => {
    if (!src ||
      !prc ||
      !successcode ||
      !merchantReference ||
      !payDollarReference ||
      !amount ||
      !payerAuthenticationStatus ||
      !secureHashFromDataFeed) {
      reject('empty parameters')
    } else {
      try {
        let dataString = src + '|' + prc + '|' + successcode + '|' + merchantReference + '|' + payDollarReference + '|' + currencyCode + '|' + amount + '|' + payerAuthenticationStatus + '|' + secretHash
        // case: multiple keys runs in parallel, cut the string in comma & space
        let hashes = secureHashFromDataFeed.split(/[\s,]+/)
        resolve(hashes.includes(SHA1(dataString).toString()))
      } catch (error) {
        reject(error)
      }
    }
  })
}
