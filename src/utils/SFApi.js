const request = require('request')
const CryptoJS = require('crypto-js')
const randomstring = require("randomstring")
const crypto = require('crypto');

class SFApi {
  constructor (partnerID, apiUrl, checkWord,) {
    this.partnerID = partnerID
    this.apiUrl = apiUrl
    this.checkWord = checkWord
  }

  request (serviceCode, data) {
    // current timestamp: number
    const timestamp = Date.now()
    // requestID: random string
    const requestID = randomstring.generate() + timestamp
    // const msgData = JSON.stringify(data)
    const msgData = JSON.stringify(data)

    let msgDigest = msgData + timestamp + this.checkWord
    // js encodes ' ' to '%20', but java encodes to '+'
    // below is a dummy convert to prevent digest error
    // msgDigest = encodeURIComponent(msgDigest).replaceAll('%20', '+')

    msgDigest = encodeURIComponent(msgDigest).replaceAll(/%20/gi, '+').replaceAll(/(!)|(')|(\()|(\))|(\~)/gi, item => {
      return '%' + item.charCodeAt(0).toString(16).toLocaleUpperCase()
    })
    msgDigest = CryptoJS.MD5(msgDigest).toString(CryptoJS.enc.Base64)

    //start requesting
    return new Promise((resolve, reject) => {
      request.post(this.apiUrl, {
        form : {
          partnerID : this.partnerID,
          requestID,
          serviceCode,
          timestamp,
          msgDigest,
          msgData
        }
      }, function (error, response, body) {
        if (error) {
          // console.log("--------------------------------------");
          // console.error(`请求遇到问题: ${ error }`);
          // console.log("--------------------------------------");
          reject(error)
        }
        if (body) {
          // console.log("--------------------------------------");
          // console.log("返回报文: " + body);
          // console.log("--------------------------------------");
          resolve(body)
        }
      })
    })

  }
}

module.exports = SFApi;
