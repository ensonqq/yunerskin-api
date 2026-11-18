const mongoose = require('mongoose')
const { toJSON, paginate } = require('./plugins')

const scheme = mongoose.Schema(
  {
    name        : { zh : { type : String }, en : { type : String } },
    createdBy   : { type : mongoose.Schema.Types.ObjectId, ref : 'User', required : true },
    item        : {
      type    : { type : String, enum : ['other', 'item'], required : true },
      product : { type : mongoose.Schema.Types.ObjectId, ref : 'Product', default : null },
      amount  : { type : Number, required : true },
    },
    rules       : {
      total    : { type : Number, required : true },
      quantity : { type : Number, required : true },
    },
    autoChecked : { type : Boolean, default : false },
    startAt     : { type : Date, required : true, },
    endAt       : { type : Date, required : true, },
    published   : { type : Boolean, default : false },
    description : { zh : { type : String }, en : { type : String } },
    images      : [{ type : mongoose.Schema.Types.ObjectId, ref : 'Image' }],
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
const Gift = mongoose.model('Gift', scheme)

module.exports = Gift
