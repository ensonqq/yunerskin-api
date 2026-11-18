const httpStatus = require('http-status')
const pick = require('../utils/pick')
const ApiError = require('../utils/ApiError')
const catchAsync = require('../utils/catchAsync')
const { voucherService, orderService } = require('../services')
const { Voucher, KolContract, KolSales, Order } = require("../models");
const _ = require("underscore")
const moment = require('moment')
const momentTz = require("moment-timezone");

const createVoucher = catchAsync(async (req, res) => {
  const voucherCode = req.body.code
  if (await Voucher.isCodeTaken(voucherCode)) {
    throw new ApiError(httpStatus.BAD_REQUEST, '優惠碼已存在: ' + voucherCode);
  }

  const voucher = await voucherService.createVoucher({ ...req.body, createdBy : req.user.id })
  res.status(httpStatus.CREATED).send(voucher)
})

const getVouchers = catchAsync(async (req, res) => {
  const advanceFilter = pick(req.query, ['status', 'search', 'kolUser'])
  const options = pick(req.query, ['sortBy', 'limit', 'page'])
  options.populate = [{ path : 'kolUser' }, { path : 'kolContracts' }]
  const filter = {}
  if (advanceFilter.status) {
    if (!filter.$and) filter.$and = []
    const status = advanceFilter.status
    const statusMap = {
      published   : { active : true },
      unpublished : { active : false },
    }

    filter.$and.push(statusMap[status]);
  }

  if (advanceFilter.search) {
    if (!filter.$and) filter.$and = []
    filter.$and.push({
      $or : ['name.zh', 'name.en', 'code'].map(item => ({ [item] : new RegExp(advanceFilter.search, 'i') }))
    })
  }

  if (advanceFilter.kolUser) {
    if (!filter.$and) filter.$and = []
    filter.$and.push({ kolUser : { $ne : null } })
  }

  const result = await voucherService.queryVouchers(filter, options)
  res.send(result)
})

const getVoucher = catchAsync(async (req, res) => {
  const voucher = await voucherService.getVoucherById(req.params.voucherId, 'kolUser')
  if (!voucher) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Voucher not found')
  }
  res.send(voucher)
})

const createKolContracts = catchAsync(async (req, res) => {
  const contracts = []
  for (let i in req.body) {
    const data = _.pick(req.body[i], ['startAt', 'endAt', 'code', 'kolUser', 'active', 'remarks', 'bonusPercentage', 'rate', 'signed'])
    const contractId = req.body[i].id
    let contract
    if (contractId) {
      // update contract
      contract = await voucherService.updateKolContractById(contractId, data)
    } else {
      // create contract
      contract = await voucherService.createKolContract(data)
    }
    contracts.push(contract)
  }
  res.status(httpStatus.CREATED).send(contracts)
})


const getKolContracts = catchAsync(async (req, res) => {
  const contracts = await voucherService.getKolContracts({ kolUser : req.params.kolId }, { limit : 999 })
  res.send(contracts)
})

const deleteKolContracts = catchAsync(async (req, res) => {
  const contracts = await KolContract.findByIdAndDelete(req.params.kolId)
  res.send(contracts)
})

const getVoucherOrders = catchAsync(async (req, res) => {
  const orders = await orderService.getVoucherOrders(req.params.voucherId)
  res.send(orders)
})

const validateVoucher = catchAsync(async (req, res) => {
  const voucher = await voucherService.validateVoucherByCode(req.params.voucherCode)
  if (!voucher) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Voucher not found')
  }

  //hide info
  delete voucher.kolUser
  res.send(voucher)
})

const checkKolOccupation = catchAsync(async (req, res) => {
  const voucher = await voucherService.checkKolOccupation(req.params.kolUserId)
  res.send(voucher)
})


const updateVoucher = catchAsync(async (req, res) => {
  const voucher = await voucherService.updateVoucherById(req.params.voucherId, req.body)
  res.send(voucher)
})

const deleteVoucher = catchAsync(async (req, res) => {
  await voucherService.deleteVoucherById(req.params.voucherId)
  res.status(httpStatus.NO_CONTENT).send()
})

const myContract = catchAsync(async (req, res) => {
  const myNextContract = await voucherService.myNextContract(req.user.id)
  res.send(myNextContract)
})

const agreeMyContract = catchAsync(async (req, res) => {
  const contractId = req.body.contractId
  const myNextContract = await voucherService.agreeMytContract(contractId, req.user.id)
  res.send(myNextContract)
})

module.exports = {
  createVoucher,
  getVouchers,
  getVoucher,
  updateVoucher,
  deleteVoucher,
  validateVoucher,
  checkKolOccupation,
  getVoucherOrders,
  getKolContracts,
  createKolContracts,
  myContract,
  agreeMyContract,
  deleteKolContracts
}
