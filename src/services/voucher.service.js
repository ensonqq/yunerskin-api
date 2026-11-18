const httpStatus = require('http-status')
const { Voucher, Order, KolContract } = require('../models')
const ApiError = require('../utils/ApiError')
const User = require("../models/user.model");
const mongoose = require('mongoose')

/**
 * Create a voucher
 * @param {Object} voucherBody
 * @returns {Promise<Voucher>}
 */
const createVoucher = async (voucherBody) => {
  return Voucher.create(voucherBody)
}

/**
 * Create a kol contract
 * @param {Object} body
 * @returns {Promise<KolContract>}
 */
const createKolContract = async (body) => {
  await checkContractAvailability(body)
  // use upsert directly, if exists -> update | else -> create
  return KolContract.create(body)
}

const checkContractAvailability = async (body, id) => {
  const contract = await KolContract.findOne({
    $and : [
      { code : body.code },
      { kolUser : body.kolUser },
      {
        $or : [
          {
            startAt : {
              $gte : body.startAt,
              $lte : body.endAt
            }
          },
          {
            endAt : {
              $gte : body.startAt,
              $lte : body.endAt
            }
          },
          {
            $and : [
              {
                startAt : {
                  $gte : body.startAt,
                }
              },
              {
                endAt : {
                  $lte : body.endAt,
                }
              },
            ]
          },
        ]
      }
    ]
  })
  if (contract && contract._id.toString() !== id) throw new ApiError(httpStatus.BAD_REQUEST, '含有重覆/重疊的合約期')
}

/**
 * Update kol contract by id
 * @param {ObjectId} kolContractId
 * @param {Object} updateBody
 * @returns {Promise<Voucher>}
 */
const updateKolContractById = async (kolContractId, updateBody) => {
  const contract = await getKolContractById(kolContractId, [])
  if (!contract) {
    throw new ApiError(httpStatus.NOT_FOUND, '合約不存在。')
  }

  await checkContractAvailability(updateBody, kolContractId)

  Object.assign(contract, updateBody)
  await contract.save()
  return contract
}

/**
 * Query for vouchers
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryVouchers = async (filter, options) => {
  return await Voucher.paginate(filter, options)
}

/**
 * Get voucher by id
 * @param {ObjectId} id
 * @param {Array|String} populate
 * @returns {Promise<Voucher>}
 */
const getVoucherById = async (id, populate) => {
  return Voucher.findById(id).populate(populate)
}

/**
 * Get kol contract by id
 * @param {ObjectId} id
 * @param {Array|String} populate
 * @returns {Promise<KolContract>}
 */
const getKolContractById = async (id, populate) => {
  return KolContract.findById(id).populate(populate)
}

/**
 * Get kol contracts by kol user id
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<KolContract>}
 */
const getKolContracts = async (filter, options) => {
  return await KolContract.paginate(filter, options)
}

/**
 * Get kol next unsigned contract
 * @param {ObjectId} kolUser
 * @returns {Promise<KolContract>}
 */
const myNextContract = async (kolUser) => {
  return KolContract.findOne({ kolUser }).sort('-createdAt').populate('code')
}

/**
 * Get kol next unsigned contract
 * @param {ObjectId} contractId
 * @param {ObjectId} userId
 * @returns {Promise<KolContract>}
 */
const agreeMytContract = async (contractId, userId) => {


  const contract = await KolContract.findOne({ _id : contractId, kolUser : userId, signed : false })
                                    .populate('code')
  if (!contract) {
    throw new ApiError(httpStatus.NOT_FOUND, '合約不存在。')
  }
  Object.assign(contract, { signed : true })
  await contract.save()
  return contract
}


/**
 * Validate voucher by id
 * @param {ObjectId} id
 * @returns {Promise<Voucher>}
 */
const validateVoucherById = async (id) => {
  const now = Date.now()
  const voucher = await Voucher.findOne({
    $and : [
      { _id : id },
      { startAt : { $lte : now } },
      { endAt : { $gte : now } },
      { active : true }
    ]
  })
  if (!voucher) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invalid voucher')
  }
  return voucher
}


/**
 * Check kol and code occupation by kol user id
 * @param {ObjectId} kolUserId
 * @returns {Promise<Voucher>}
 */
const checkKolOccupation = async (kolUserId) => {
  return Voucher.findOne({ kolUser : kolUserId })
}

/**
 * Validate voucher by id
 * @param {string} code
 * @returns {Promise<Voucher>}
 */
const validateVoucherByCode = async (code) => {
  const now = Date.now()
  const voucher = await Voucher.findOne({
    $and : [
      { code : new RegExp(`^${code.trim()}$`, 'i') },
      { startAt : { $lte : now } },
      { endAt : { $gte : now } },
      { active : true }
    ]
  })

  if (!voucher) {
    throw new ApiError(httpStatus.BAD_REQUEST, '優惠碼不正確或已完結')
  }

  if (voucher.limited) {
    if (voucher.usageCnt > voucher.availableUsageCnt) {
      throw new ApiError(httpStatus.BAD_REQUEST, '優惠碼已達使用上限')
    }
  }

  return voucher
}

/**
 * Update voucher by id
 * @param {ObjectId} voucherId
 * @param {Object} updateBody
 * @returns {Promise<Voucher>}
 */
const updateVoucherById = async (voucherId, updateBody) => {
  const voucher = await getVoucherById(voucherId)
  if (!voucher) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Voucher not found')
  }

  Object.assign(voucher, updateBody)
  await voucher.save()
  return voucher
}

/**
 * Use voucher, usageCnt deduct by 1
 * @param {ObjectId} voucherId
 * @returns {Promise<Voucher>}
 */
const useVoucher = async (voucherId, paidTotal) => {
  const voucher = await getVoucherById(voucherId)

  const updateBody = { "$inc" : { "usageCnt" : 1, "turnover" : paidTotal } }

  if (voucher.limited) {
    updateBody.$inc.availableUsageCnt = -1
  }

  return Voucher.findByIdAndUpdate(voucherId, updateBody);
}
/**
 * update voucher usage
 * @param {ObjectId} voucherId
 * @returns {Promise<Voucher>}
 */
const updateUsage = async (voucherId) => {
  const voucher = await getVoucherById(voucherId)
  const usageCnt = await Order.countDocuments({ orderStatus : 'confirmed', voucherUsed : voucherId })
  const amount = await Order.aggregate([
    { $match : { orderStatus : 'confirmed', voucherUsed : mongoose.Types.ObjectId(voucherId) } },
    { $group : { _id : null, amount : { $sum : "$paidTotal" } } },
  ])

  let turnover = 0
  if (amount[0]) {
    turnover = amount[0].amount
  }
  const updateBody = { usageCnt, turnover }

  if (voucher.limited) {
    updateBody.$inc.availableUsageCnt = -1
  }

  return Voucher.findByIdAndUpdate(voucherId, updateBody);
}

/**
 * Delete voucher by id
 * @param {ObjectId} voucherId
 * @returns {Promise<Voucher>}
 */
const deleteVoucherById = async (voucherId) => {
  const voucher = await getVoucherById(voucherId)
  if (!voucher) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Voucher not found')
  }
  await voucher.remove()
  return voucher
}

module.exports = {
  useVoucher,
  updateUsage,
  createVoucher,
  queryVouchers,
  getVoucherById,
  updateVoucherById,
  deleteVoucherById,
  validateVoucherById,
  validateVoucherByCode,
  checkKolOccupation,
  getKolContracts,
  createKolContract,
  updateKolContractById,
  myNextContract,
  agreeMytContract
}
