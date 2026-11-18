const mongoose = require('mongoose')
const { toJSON, paginate } = require('./plugins')

const scheme = mongoose.Schema(
  {
    fullAddress    : { type : String, required : true },
    fullAddressEn  : { type : String },
    code           : { type : String, required : true },
    shortAddress   : { type : String, required : true },
    shortAddressEn : { type : String },
    workingHour    : { type : String, required : true, },
    workingHourEn  : { type : String },
    longitude      : { type : String, required : true, },
    latitude       : { type : String, required : true, },
    area           : { type : String, required : true }, //"kln/hk/nt"
    areaTc         : { type : String, required : true }, //"香港/九龍/新界"
    district       : { type : String, required : true },  //"觀塘區"
    subDistrict    : { type : String, required : true },  //"尖沙咀"
  },
  {
    timestamps : true,
  }
)

// add plugin that converts mongoose to json
scheme.plugin(toJSON)
scheme.plugin(paginate)

/**
 * @typedef Order
 */
const PickUpAddress = mongoose.model('PickUpAddress', scheme)

module.exports = PickUpAddress
