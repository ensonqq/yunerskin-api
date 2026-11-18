// todo, key account management, for circklek, pure, tvmall etc.

const mongoose = require('mongoose')
const { toJSON, paginate } = require('./plugins')
const { locations } = require("../config/locations");
const _ = require("underscore");

//db.vouchers.updateMany({}, {$set: {"remarks": ""}});
const schema = mongoose.Schema(
  {
    name                : { type : String, required : true },
    description         : { type : String, default : '' },
    skuPrice            : [{
      type    : mongoose.Schema({
        item  : { type : mongoose.Schema.Types.ObjectId, ref : 'Product', default : null },
        price : Number,
      }),
      default : []
    }],
    addresses           : [{
      fullAddress : { type : String },
      area        : { type : String, enum : Object.keys(locations) },
      district    : { type : String, enum : Object.keys({ ...locations.hk, ...locations.kln, ...locations.nt }) },
      subDistrict : { type : String, enum : _.flatten(_.map(locations, _.values)) },
      recipient   : { type : String },
      phone       : { type : String },
      shortName   : { type : String }
    }],
    discount            : [{
      type    : mongoose.Schema({
        quantity : Number,
        value    : Number,
        name     : String
      }),
      default : []
    }],
    discountTierEnabled : {
      type    : Boolean,
      default : true
    },
    remarks             : { type : String, default : '' },
    publish             : { type : Boolean, default : true },
  },
  {
    timestamps : true,
  },
)

/**
 * Virtual
 */
// schema.virtual('sales', {
//   ref          : 'KolSales',
//   localField   : 'kol',
//   foreignField : 'kol',
// })
// virtual tobe exported
schema.set('toObject', { virtuals : true });
schema.set('toJSON', { virtuals : true });

// add plugin that converts mongoose to json
schema.plugin(toJSON)
schema.plugin(paginate)

/**
 * @typedef kolProfileModel
 */
const kolProfileModel = mongoose.model('KolProfile', schema)

module.exports = kolProfileModel
