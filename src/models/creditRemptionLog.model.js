const mongoose = require('mongoose')
const { toJSON, paginate } = require('./plugins')
const Joi = require("joi");

const schema = mongoose.Schema(
  {
    redeemedBy          : { type : mongoose.SchemaTypes.ObjectId, ref : 'User', required : true },
    credits             : { type : Number, required : true },
    creditRedemptionRef : { type : mongoose.SchemaTypes.ObjectId, ref : 'CreditRedemption', required : true }
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
 * @typedef CreditRedemptionLog
 */
const CreditRedemptionLog = mongoose.model('CreditRedemptionLog', schema)

module.exports = CreditRedemptionLog
