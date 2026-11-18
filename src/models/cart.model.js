const mongoose = require('mongoose')
const { toJSON, paginate } = require('./plugins')

const scheme = mongoose.Schema(
  {
    createdBy : { type : mongoose.Schema.Types.ObjectId, ref : 'User', required : true },
    items     : [{
      product  : { type : mongoose.Schema.Types.ObjectId, ref : 'Product', required : true },
      quantity : { type : Number, required : true },
      addons   : {
        name  : {
          zh : { type : String },
          en : { type : String }
        },
        price : { type : Number }
      }
    }]
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
const Cart = mongoose.model('Cart', scheme)

module.exports = Cart
