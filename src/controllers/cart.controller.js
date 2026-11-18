const httpStatus = require('http-status')
const { Image, Product } = require('../models')
const ApiError = require('../utils/ApiError')
const catchAsync = require("../utils/catchAsync")
const pick = require("../utils/pick")
const { cartService } = require('../services')

exports.myCart = catchAsync(async (req, res, next) => {
  const myCart = await cartService.myCart(req.user.id)
  return res.send(myCart)
})

//update my shopping cart
exports.updateCart = catchAsync(async (req, res, next) => {
  const updateCart = await cartService.updateCart(req.user.id, req.body.items)
  return res.send(updateCart)
})

//upload my shopping card (non-member)
exports.updateCartCookies = catchAsync(async (req, res, next) => {
  //no use
  return res.send({})
})
