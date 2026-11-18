const httpStatus = require('http-status')
const pick = require('../utils/pick')
const ApiError = require('../utils/ApiError')
const catchAsync = require('../utils/catchAsync')
const { giftService } = require('../services')
const _ = require("lodash")
const createGift = catchAsync(async (req, res) => {
  req.body.createdBy = req.user.id
  const gift = await giftService.createGift(req.body)
  res.status(httpStatus.CREATED).send(gift)
})

const getPublishedGifts = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page'])
  options.populate = [{ path : 'images' }, { path : 'item', populate : { path : 'product', populate : 'images' } }]

  const now = new Date()
  const result = await giftService.queryGifts({
    published : true, startAt : { $lte : now.toISOString() }, endAt : { $gte : now.toISOString() }
  }, options)
  return res.send(result)
})

const getGifts = catchAsync(async (req, res) => {
  const advanceFilter = pick(req.query, ['status', 'search'])
  const options = pick(req.query, ['sortBy', 'limit', 'page'])

  const filter = {}
  if (advanceFilter.status) {
    if (!filter.$and) filter.$and = []
    const status = advanceFilter.status
    const statusMap = {
      published : { published : true },
      unpublished : { published : false },
    }

    filter.$and.push(statusMap[status]);
  }

  if (advanceFilter.search) {
    if (!filter.$and) filter.$and = []

    filter.$and.push({
      $or : ['name.zh', 'name.en'].map(item => ({ [item] : new RegExp(advanceFilter.search, 'i') }))
    })
  }

  options.populate = [
    { path : 'images' },
    {
      path : 'item', populate : [
        {
          path : 'product', populate : [
            { path : 'images' },
            { path : 'category', populate : { path : 'images' } }]
        }]
    }
  ]

  const result = await giftService.queryGifts(filter, options)
  return res.send(result)
})

const getGift = catchAsync(async (req, res) => {
  const gift = await giftService.getGiftById(req.params.giftId)
  if (!gift) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Gift not found')
  }
  res.send(gift)
})

const updateGift = catchAsync(async (req, res) => {
  const gift = await giftService.updateGiftById(req.params.giftId, req.body)
  res.send(gift)
})

const deleteGift = catchAsync(async (req, res) => {
  await giftService.deleteGiftById(req.params.giftId)
  res.status(httpStatus.NO_CONTENT).send()
})

module.exports = {
  createGift,
  getGifts,
  getGift,
  updateGift,
  deleteGift,
  getPublishedGifts,
}
