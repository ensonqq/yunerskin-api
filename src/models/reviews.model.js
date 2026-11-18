const mongoose = require('mongoose')
const { toJSON, paginate } = require('./plugins')
const { networkInterfaces } = require("nodemailer/lib/shared")
const bcrypt = require("bcryptjs");

const scheme = mongoose.Schema(
  {
    sku       : { type : mongoose.Schema.Types.ObjectId, ref : 'Product', required : true },
    images    : [{ type : mongoose.Schema.Types.ObjectId, ref : 'Image', default : [] }],
    content   : { type : String, default : '' },
    reviews   : [{ type : mongoose.Schema.Types.ObjectId, ref : 'Review', default : [] }],
    ratings   : { type : Number, required : true },
    createdBy : { type : mongoose.Schema.Types.ObjectId, ref : 'User', required : true },
    status    : { type : Boolean, default : false },
  },
  {
    timestamps : true,
  }
)

// add plugin that converts mongoose to json
scheme.plugin(toJSON)
scheme.plugin(paginate)

/**
 * @typedef Product
 */
const Product = mongoose.model('Product', scheme)

module.exports = Product
