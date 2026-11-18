const mongoose = require('mongoose')
const { toJSON, paginate } = require('./plugins')

const scheme = mongoose.Schema(
  {
    name      : { zh : { type : String }, en : { type : String } },
    festival  : { type : String, required : true },
    createdBy : { type : mongoose.Schema.Types.ObjectId, ref : 'User', required : true },

    items : [{
      type    : { type : String, enum : ['cash', 'item'], required : true },
      product : { type : mongoose.Schema.Types.ObjectId, ref : 'Product', default : null },
      amount  : { type : Number, required : true },
    }],

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
const Prize = mongoose.model('Prize', scheme)

module.exports = Prize
