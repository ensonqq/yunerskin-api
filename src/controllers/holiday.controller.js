const httpStatus = require('http-status')
const pick = require('../utils/pick')
const ApiError = require('../utils/ApiError')
const catchAsync = require('../utils/catchAsync')
const _ = require("underscore")
const Holidays = require('date-holidays')
const hkHolidays = new Holidays('HK')

const getHolidays = catchAsync(async (req, res) => {
  const data = hkHolidays.getHolidays('2023')
  return res.send(data)
})

module.exports = {
  getHolidays,
}
