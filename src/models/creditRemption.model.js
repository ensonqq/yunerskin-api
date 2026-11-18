const mongoose = require('mongoose')
const { toJSON, paginate } = require('./plugins')
const { boolean } = require("joi");
const Joi = require("joi");

const schema = mongoose.Schema(
  {
    name      : {
      zh : { type : String, required : true },
      en : { type : String, required : true },
    },

    uniqueId  : {
      type     : String,
      required : true,
      unique   : true
    },

    createdBy : { type : mongoose.SchemaTypes.ObjectId, ref : 'User', required : true, private : true },

    credits      : { type : Number, required : true },
    maxRedeemQty : { type : Number, required : true },
    // redeemQty+1: accumulate on every user redemption
    redeemQty : { type : Number, default : 0 },
    publish   : { type : Boolean, default : false },
    remarks   : { type : String, default : '' },
    images    : [{ type : mongoose.Schema.Types.ObjectId, ref : 'Image', default : [] }],
  },
  {
    timestamps : true,
  },
)

// virtual tobe exported
schema.set('toObject', { virtuals : true });
schema.set('toJSON', { virtuals : true });

// add plugin that converts mongoose to json
schema.plugin(toJSON)
schema.plugin(paginate)

/**
 * @typedef CreditRedemption
 */
const CreditRedemption = mongoose.model('CreditRedemption', schema)

module.exports = CreditRedemption
