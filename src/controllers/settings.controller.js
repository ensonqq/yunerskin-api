const httpStatus = require('http-status');
const catchAsync = require("../utils/catchAsync");
const locations = require('../config/locations')
const moment = require('moment')
// const Holidays = require('date-holidays')
// const hkHolidays = new Holidays('HK')
const Setting = require('../models/setting.model')
const pickupPointsArray = require('../config/pickupPointsArray')
// const pickupPoints = require('../config/pickupPoints')
const _ = require("underscore");
const { PickUpAddress } = require('../models/')
exports.getLocations = catchAsync(async (req, res, next) => {
  return res.send(locations)
})

// not used in frontend
exports.getPickupPointsArray = catchAsync(async (req, res, next) => {
  // Enson: deprecated 2024-05-13
  // not using in admin or frontend.
  const pickupPoints = {}
  pickupPointsArray.forEach(item => {
    if (!pickupPoints[item.subDistrict]) pickupPoints[item.subDistrict] = []
    pickupPoints[item.subDistrict].push({
      fullAddress : item.fullAddress, code : item.code, shortAddress : item['網點簡稱'], subDistrict : item.subDistrict,
      workingHour : item.workingHour
    })
  })
  return res.send(pickupPoints)
})

//pickup points
exports.getPickupPoints = catchAsync(async (req, res, next) => {
  // update to get pick up addresses from database
  const pickupPointsArray = await PickUpAddress.find({}).exec()
  const pickupPoints = {}
  pickupPointsArray.forEach(item => {
    if (!pickupPoints[item.subDistrict]) pickupPoints[item.subDistrict] = []
    pickupPoints[item.subDistrict].push(item)
  })


  return res.send(pickupPoints)
})

//holidays
exports.getHolidays = catchAsync(async (req, res, next) => {
  //TODO setting holidays
  // const data = hkHolidays.getHolidays(moment().format('YYYY')).map(item => item.start)
  const settings = await Setting.findOne({ name : 'holidays' }).exec()
  const holidays = settings && settings.value ? settings.value : []
  return res.send(holidays)
})

exports.getSystemTime = catchAsync(async (req, res, next) => {
  const now = moment().toISOString()
  return res.send({ now })
})


exports.setHolidays = catchAsync(async (req, res, next) => {
  const result = await Setting.findOneAndUpdate({ name : 'holidays' }, { $set : { value : req.body } }, { new : true, upsert : true })
  return res.send(result)
})


//holidays
exports.getSkuSorting = catchAsync(async (req, res, next) => {
  //TODO setting holidays
  // const data = hkHolidays.getHolidays(moment().format('YYYY')).map(item => item.start)
  const settings = await Setting.findOne({ name : 'skuSorting' }).exec()
  const holidays = settings && settings.value ? settings.value : []
  return res.send(holidays)
})

exports.setSkuSorting = catchAsync(async (req, res, next) => {
  const result = await Setting.findOneAndUpdate({ name : 'skuSorting' }, { $set : { value : req.body } }, { new : true, upsert : true })
  return res.send(result)
})

//alert
exports.getAlert = catchAsync(async (req, res, next) => {
  const settings = await Setting.findOne({ name : 'alert' }).exec()
  return res.send(settings)
})

exports.setAlert = catchAsync(async (req, res, next) => {
  const result = await Setting.findOneAndUpdate({ name : 'alert' }, { $set : { value : req.body } }, { new : true, upsert : true })
  return res.send(result)
})

//student alert
exports.getStudentAlert = catchAsync(async (req, res, next) => {
  const settings = await Setting.findOne({ name : 'studentAlert' }).exec()
  return res.send(settings)
})

exports.setStudentAlert = catchAsync(async (req, res, next) => {
  const result = await Setting.findOneAndUpdate({ name : 'studentAlert' }, { $set : { value : req.body } }, { new : true, upsert : true })
  return res.send(result)
})

// registration credits
exports.getRegisterCredits = catchAsync(async (req, res, next) => {
  const result = await Setting.findOne({ name : 'registerCredits' })
  return res.send(result)
})

exports.setRegisterCredits = catchAsync(async (req, res, next) => {
  const result = await Setting.findOneAndUpdate({ name : 'registerCredits' }, { $set : req.body }, { new : true, upsert : true })
  return res.send(result)
})
