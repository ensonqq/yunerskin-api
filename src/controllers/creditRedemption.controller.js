const httpStatus = require('http-status')
const pick = require('../utils/pick')
const ApiError = require('../utils/ApiError')
const catchAsync = require('../utils/catchAsync')
const { creditRedemptionService } = require('../services')
const _ = require("underscore");
const randomstring = require("randomstring");
const config = require('../config/config')

// CreditRedemption cards
const createCreditRedemption = catchAsync(async (req, res) => {
  const data = req.body
  data.createdBy = req.user.id
  data.uniqueId = randomstring.generate(5)
  const result = await creditRedemptionService.createCreditRedemption(req.body)
  res.status(httpStatus.CREATED).send(result)
})

const getCreditRedemptions = catchAsync(async (req, res) => {
  const advanceFilter = pick(req.query, ['status', 'search'])
  const options = pick(req.query, ['sortBy', 'limit', 'page'])

  const filter = {}
  if (advanceFilter.status) {
    if (!filter.$and) filter.$and = []
    const status = advanceFilter.status
    const statusMap = {
      published   : { publish : true },
      unpublished : { publish : false },
    }

    filter.$and.push(statusMap[status]);
  }

  if (advanceFilter.search) {
    if (!filter.$and) filter.$and = []

    filter.$and.push({
      $or : ['name.zh', 'name.en', 'phone'].map(item => ({ [item] : new RegExp(advanceFilter.search, 'i') }))
    })
  }

  options.populate = [{ path : 'images' }]
  const result = await creditRedemptionService.queryCreditRedemptions(filter, options)
  return res.send(result)
})

const getCreditRedemption = catchAsync(async (req, res) => {
  // const filter = { result : req.params.creditRedemptionId }
  // const options = pick(req.query, ['sortBy', 'limit', 'page'])
  // options.populate = 'images result'

  const result = await creditRedemptionService.getCreditRedemptionById(req.params.creditRedemptionId)
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, '領取碼不存在')
  }
  res.send(result)
})

const getCreditRedemptionAvailability = catchAsync(async (req, res) => {
  if (!config.features.creditsEnabled) {
    throw new ApiError(httpStatus.FORBIDDEN, '積分功能暫停開放。')
  }

  const result = await creditRedemptionService.getCreditRedemptionAvailabilityByUniqueId(req.params.creditRedemptionUniqueId, req.user.id)
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, '領取碼不存在')
  }
  res.send(result)
})

const redeem = catchAsync(async (req, res) => {
  if (!config.features.creditsEnabled) {
    throw new ApiError(httpStatus.FORBIDDEN, '積分功能暫停開放。')
  }

  const redemption = await creditRedemptionService.createRedemption(req.params.creditRedemptionUniqueId, req.user.id)
  res.send(redemption)
})

const updateCreditRedemption = catchAsync(async (req, res) => {
  const result = await creditRedemptionService.updateCreditRedemptionById(req.params.creditRedemptionId, req.body)
  res.send(result)
})

const getCreditRedemptionLogs = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page'])

  // construct orders filtering
  let filter = { creditRedemptionRef : req.params.creditRedemptionId }
  options.populate = [{ path : 'creditRedemptionRef' }, { path : 'redeemedBy' }]
  const result = await creditRedemptionService.queryCreditRedemptionLogs(filter, options)
  return res.send(result)
})

module.exports = {
  createCreditRedemption,
  getCreditRedemptions,
  getCreditRedemption,
  updateCreditRedemption,
  getCreditRedemptionLogs,
  getCreditRedemptionAvailability,
  redeem
}
