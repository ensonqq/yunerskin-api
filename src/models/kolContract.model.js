const mongoose = require('mongoose')
const { toJSON, paginate } = require('./plugins')

const schema = mongoose.Schema(
  {
    startAt         : { type : Date, required : true, },
    endAt           : { type : Date, required : true, },
    active          : { type : Boolean, default : true },
    remarks         : { type : String, default : '' },
    kolUser         : { type : mongoose.Schema.Types.ObjectId, ref : 'User', required : true },
    code            : { type : mongoose.Schema.Types.ObjectId, ref : 'Voucher', required : true },
    bonusPercentage : { type : Number, default : 10 },
    rate            : { type : Number, default : 3 },
    signed          : { type : Boolean, default : false }
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
 * @typedef KolContract
 */
const KolContract = mongoose.model('KolContract', schema)

module.exports = KolContract
