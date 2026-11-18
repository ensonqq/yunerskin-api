const mongoose = require('mongoose')
const { toJSON, paginate } = require('./plugins')

const scheme = mongoose.Schema({
  createdBy : { type : mongoose.Schema.Types.ObjectId, ref : 'User', required : true },
  item      : {
    type        : { type : String, enum : ['cash', 'item'], required : true },
    product     : { type : mongoose.Schema.Types.ObjectId, ref : 'Product' },
    amount      : { type : Number, required : true },
    prizeItemId : { type : mongoose.Schema.Types.ObjectId, required : true },
  },

  prizeRef : { type : mongoose.Schema.Types.ObjectId, ref : 'Prize', required : true },
}, {
  timestamps : true,
})

// add plugin that converts mongoose to json
scheme.plugin(toJSON)
scheme.plugin(paginate)

/**
 * @typedef Order
 */
const PrizeRecord = mongoose.model('PrizeRecord', scheme)

module.exports = PrizeRecord
