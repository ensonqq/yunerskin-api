const httpStatus = require('http-status')
const { Image, Product } = require('../models')
const ApiError = require('../utils/ApiError')
const catchAsync = require("../utils/catchAsync")
const pick = require("../utils/pick")
const { cartService, kolService } = require('../services')
const axios = require('axios')
//TODO fps qrcpde generator, postman ready
exports.getQrcode = catchAsync(async (req, res, next) => {
  const request = await axios.post('https://payment-request-api-qr-code-2m7n.gw.openapihub.com/v2/payment-requests', req.body, {
    headers : { 'X-Openapihub-Key' : 'ed79cb8ae0ee444f8f03fe922197f614' }
  })
  return res.send(request.data)
})
