const mongoose = require('mongoose')
const { toJSON, paginate } = require('./plugins')
const { boolean } = require("joi");
const Joi = require("joi");

//db.vouchers.updateMany({}, {$set: {"remarks": ""}});
const schema = mongoose.Schema(
  {
    code : { type : String, unique : true, trim : true, required : true, },
    name : {
      zh : { type : String, required : true },
      en : { type : String, required : true },
    },
    /**
     * type
     * - percent: discount by percentage off, formula = orderSum * value
     * - fixed: discount by fixed amount, formula = orderSum - fixed
     * - buyXGetYFree: buy x get y free, formula = free cheapest item * y for item qty >= x
     */
    type : { type : String, enum : ['percent', 'fixed', 'buyXGetYFree'], required : true },

    //total $ gained from voucher, order.paidTotal
    turnover : { type : Number, default : 0, },


    //MOQ
    moq : { type : Number, default : 0 },

    //MOV
    mov : { type : Number, default : 0 },

    /**
     * format: 2022/8/4, localeDateString: zh-TW
     */
    startAt           : { type : Date, required : true, },
    endAt             : { type : Date, required : true, },
    limited           : { type : Boolean, default : false },
    usageCnt          : { type : Number, default : 0, }, // voucher usage counter, +1 for each usage.
    availableUsageCnt : { type : Number, default : 999999, }, // available usage times for voucher, -1 for each usage.
    value             : { type : Number, required : true }, //always less than 0
    createdBy         : { type : mongoose.SchemaTypes.ObjectId, ref : 'User', required : true, private : true },

    /**
     * KOL Scheme, added 20230504
     */
    kolStartAt : { type : Date, default : null },
    kolEndAt   : { type : Date, default : null },
    kolUser    : { type : mongoose.Schema.Types.ObjectId, ref : 'User', default : null },
    kolProfile : { type : mongoose.Schema.Types.ObjectId, ref : 'KOLProfile', default : null },
    active     : { type : Boolean, default : true },
    remarks    : { type : String, default : '' },
  },
  {
    timestamps : true,
  },
)

/**
 * Virtual
 */
schema.virtual('orders', {
  ref          : 'Order',
  localField   : '_id',
  foreignField : 'voucherUsed',
})

schema.virtual('kolContracts', {
  ref          : 'KolContract',
  localField   : '_id',
  foreignField : 'code',
})

/**
 * Check if voucher code is taken
 * @param {string} voucherCode - Voucher Code (unique)
 * @returns {Promise<boolean>}
 */
schema.statics.isCodeTaken = async function (voucherCode) {
  const voucher = await this.findOne({ code : new RegExp(`^${voucherCode.trim()}$`, 'i') });
  return !!voucher;
}

// virtual tobe exported
schema.set('toObject', { virtuals : true });
schema.set('toJSON', { virtuals : true });

// add plugin that converts mongoose to json
schema.plugin(toJSON)
schema.plugin(paginate)

/**
 * @typedef Voucher
 */
const Voucher = mongoose.model('Voucher', schema)

module.exports = Voucher
