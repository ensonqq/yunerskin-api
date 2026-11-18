const httpStatus = require('http-status')
const pick = require('../utils/pick')
const ApiError = require('../utils/ApiError')
const catchAsync = require('../utils/catchAsync')
const { retailService } = require('../services')

const createRetail = catchAsync(async (req, res) => {
  const retail = await retailService.createRetail(req.body)
  res.status(httpStatus.CREATED).send(retail)
})

const getRetails = catchAsync(async (req, res) => {
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
      $or : ['name.zh', 'name.en', 'phone', 'area'].map(item => ({ [item] : new RegExp(advanceFilter.search, 'i') }))
    })
  }

  options.populate = [{ path : 'images' }]

  const result = await retailService.queryRetails(filter, options)
  return res.send(result)
})

const getRetail = catchAsync(async (req, res) => {
  const retail = await retailService.getRetailById(req.params.retailId)
  if (!retail) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Retail not found')
  }
  res.send(retail)
})

const updateRetail = catchAsync(async (req, res) => {
  const retail = await retailService.updateRetailById(req.params.retailId, req.body)
  res.send(retail)
})

const deleteRetail = catchAsync(async (req, res) => {
  await retailService.deleteRetailById(req.params.retailId)
  res.status(httpStatus.NO_CONTENT).send()
})

module.exports = {
  createRetail,
  getRetails,
  getRetail,
  updateRetail,
  deleteRetail
}
