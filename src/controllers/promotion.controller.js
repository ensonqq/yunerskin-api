const httpStatus = require('http-status')
const pick = require('../utils/pick')
const ApiError = require('../utils/ApiError')
const catchAsync = require('../utils/catchAsync')
const { promotionService } = require('../services')

const createPromotion = catchAsync(async (req, res) => {
  const category = await promotionService.createPromotion(req.body)
  res.status(httpStatus.CREATED).send(category)
})

const getPublishedPromotions = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page'])
  const filters = pick(req.query, ['type'])
  options.populate = [{ path : 'images' }]

  const type = { $in : ['all'] }
  if (filters.type) {
    type.$in.push(filters.type)
  }
  const result = await promotionService.queryPromotions({ publish : true, ...filters, type }, options)
  return res.send(result)
})

const getPromotions = catchAsync(async (req, res) => {
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
  if (req.query.products) {
    options.populate.push({
      path     : 'products',
      populate : 'images category'
    })
  }

  const result = await promotionService.queryPromotions(filter, options)
  return res.send(result)
})

const getPromotion = catchAsync(async (req, res) => {
  // const filter = { category : req.params.promotionId }
  // const options = pick(req.query, ['sortBy', 'limit', 'page'])
  // options.populate = 'images category'

  const category = await promotionService.getPromotionById(req.params.promotionId)
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promotion not found')
  }
  res.send(category)
})

const updatePromotion = catchAsync(async (req, res) => {
  const category = await promotionService.updatePromotionById(req.params.promotionId, req.body)
  res.send(category)
})

const deletePromotion = catchAsync(async (req, res) => {
  await promotionService.deletePromotionById(req.params.promotionId)
  res.status(httpStatus.NO_CONTENT).send()
})

module.exports = {
  createPromotion,
  getPromotions,
  getPromotion,
  updatePromotion,
  deletePromotion,
  getPublishedPromotions
}
