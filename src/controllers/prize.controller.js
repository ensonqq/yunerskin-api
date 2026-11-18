const httpStatus = require('http-status')
const pick = require('../utils/pick')
const ApiError = require('../utils/ApiError')
const catchAsync = require('../utils/catchAsync')
const { prizeService, userService } = require('../services')
const PriceRecord = require('../models/prizeRecord.model')
const _ = require("lodash")
const createPrize = catchAsync(async (req, res) => {
  req.body.createdBy = req.user.id
  const prize = await prizeService.createPrize(req.body)
  res.status(httpStatus.CREATED).send(prize)
})

const getPublishedPrizes = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page'])
  options.populate = [{ path : 'images' }, { path : 'items', populate : { path : 'product', populate : 'images' } }]
  const result = await prizeService.queryPrizes({ published : true }, options)
  return res.send(result)
})

const getPrizes = catchAsync(async (req, res) => {
  const advanceFilter = pick(req.query, ['status', 'search'])
  const options = pick(req.query, ['sortBy', 'limit', 'page'])

  const filter = {}
  if (advanceFilter.status) {
    if (!filter.$and) filter.$and = []
    const status = advanceFilter.status
    const statusMap = {
      published   : { published : true },
      unpublished : { published : false },
    }

    filter.$and.push(statusMap[status]);
  }

  if (advanceFilter.search) {
    if (!filter.$and) filter.$and = []

    filter.$and.push({
      $or : ['name.zh', 'name.en', 'festival'].map(item => ({ [item] : new RegExp(advanceFilter.search, 'i') }))
    })
  }

  options.populate = [
    { path : 'images' },
    {
      path : 'items', populate : [
        {
          path : 'product', populate : [
            { path : 'images' },
            { path : 'category', populate : { path : 'images' } }]
        }]
    }
  ]

  const result = await prizeService.queryPrizes(filter, options)
  return res.send(result)
})

const getPrizeRecords = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page'])
  const advanceFilter = pick(req.query, ['search'])
  const filter = {}

  if (advanceFilter.search) {
    const userFilter = {}
    if (!userFilter.$and) userFilter.$and = []
    userFilter.$and.push({
      $or : ['email', 'name', 'remarks', 'addresses.phone'].map(item => ({ [item] : new RegExp(advanceFilter.search, 'i') }))
    })
    let users = await userService.queryUsers(userFilter, { limit : 999, select : 'id' });
    users = users.results.map(user => user.id.toString())

    if (!filter.$and) filter.$and = []
    filter.$and.push({
      createdBy : { $in : users }
    })
  }

  options.populate = [
    { path : 'createdBy' },
    {
      path : 'prizeRef', populate : [
        {
          path : 'images',
        }, {
          path : 'items', populate : [
            { path : 'product', populate : [{ path : 'images' }] },]
        }]
    },
    {
      path : 'item', populate : [
        { path : 'product', populate : [{ path : 'images' }] }
      ]
    }
  ]

  const result = await prizeService.queryPrizeRecords(filter, options)
  return res.send(result)
})

const getMyPrize = catchAsync(async (req, res) => {
  const myPrize = await prizeService.getMyPrice(req.user.id)
  res.send(myPrize)
})

const updateMyPrize = catchAsync(async (req, res) => {
  const prize = await prizeService.getPrizeById(req.body.prizeId)
  if (!prize || !prize.published) throw new ApiError(httpStatus.NOT_FOUND, '獎品不存在')

  // enable for productionorde
  const duplicate = await PriceRecord.findOne({ prizeRef : req.body.prizeId, createdBy : req.user.id })
  if (duplicate) throw new ApiError(httpStatus.FORBIDDEN, '你已有獎品')

  const random = Math.floor(Math.random() * prize.items.length);
  const item = prize.items[random].toJSON()
  if (!item) throw new ApiError(httpStatus.NOT_FOUND, '獎品不存在')

  const data = {
    item     : {
      ...item,
      prizeItemId : item._id
    },
    prizeRef : req.body.prizeId,
  }
  const myPrize = await prizeService.updateMyPrize(req.user.id, data)
  res.send(myPrize)
})

const getPrize = catchAsync(async (req, res) => {
  const prize = await prizeService.getPrizeById(req.params.prizeId)
  if (!prize) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Prize not found')
  }
  res.send(prize)
})

const updatePrize = catchAsync(async (req, res) => {
  const prize = await prizeService.updatePrizeById(req.params.prizeId, req.body)
  res.send(prize)
})

const deletePrize = catchAsync(async (req, res) => {
  await prizeService.deletePrizeById(req.params.prizeId)
  res.status(httpStatus.NO_CONTENT).send()
})

const deletePrizeRecord = catchAsync(async (req, res) => {
  await prizeService.deletePrizeRecordById(req.params.prizeRecordId)
  res.status(httpStatus.NO_CONTENT).send()
})
const deleteAllPrizeRecord = catchAsync(async (req, res) => {
  await prizeService.deleteAllPrizeRecord()
  res.status(httpStatus.NO_CONTENT).send()
})

module.exports = {
  createPrize,
  getPrizes,
  getPrize,
  updatePrize,
  deletePrize,
  getPublishedPrizes,
  updateMyPrize,
  getMyPrize,
  getPrizeRecords,
  deletePrizeRecord,
  deleteAllPrizeRecord
}
