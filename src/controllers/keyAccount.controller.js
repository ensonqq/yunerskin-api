const httpStatus = require('http-status')
const pick = require('../utils/pick')
const ApiError = require('../utils/ApiError')
const catchAsync = require('../utils/catchAsync')
const { keyAccountService } = require('../services')


const createKeyAccount = catchAsync(async (req, res) => {
  const keyAccount = await keyAccountService.createKeyAccount(req.body)
  res.status(httpStatus.CREATED).send(keyAccount)
})

const getKeyAccounts = catchAsync(async (req, res) => {
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
      populate : 'images keyAccount'
    })
  }

  const result = await keyAccountService.queryKeyAccounts(filter, options)
  return res.send(result)
})

const getKeyAccount = catchAsync(async (req, res) => {
  // const filter = { keyAccount : req.params.keyAccountId }
  // const options = pick(req.query, ['sortBy', 'limit', 'page'])
  // options.populate = 'images keyAccount'

  const keyAccount = await keyAccountService.getKeyAccountById(req.params.keyAccountId)
  if (!keyAccount) {
    throw new ApiError(httpStatus.NOT_FOUND, 'KeyAccount not found')
  }
  res.send(keyAccount)
})

const updateKeyAccount = catchAsync(async (req, res) => {
  const keyAccount = await keyAccountService.updateKeyAccountById(req.params.keyAccountId, req.body)
  res.send(keyAccount)
})

const deleteKeyAccount = catchAsync(async (req, res) => {
  await keyAccountService.deleteKeyAccountById(req.params.keyAccountId)
  res.status(httpStatus.NO_CONTENT).send()
})

module.exports = {
  createKeyAccount,
  getKeyAccounts,
  getKeyAccount,
  updateKeyAccount,
  deleteKeyAccount,
}
