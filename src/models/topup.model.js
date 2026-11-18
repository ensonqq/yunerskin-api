const mongoose = require('mongoose')
const { toJSON, paginate } = require('./plugins')
const { boolean } = require("joi");
const Joi = require("joi");

const schema = mongoose.Schema(
  {
    name : {
      zh : { type : String, required : true },
      en : { type : String, required : true },
    },

    title : {
      zh : { type : String, required : true },
      en : { type : String, required : true },
    },

    desc : {
      zh : { type : String, required : true },
      en : { type : String, required : true },
    },

    validity : { type : String, required : true },

    /**
     * format: 2022/8/4, localeDateString: zh-TW
     */
    createdBy : { type : mongoose.SchemaTypes.ObjectId, ref : 'User', required : true, private : true },

    // selling price
    price         : { type : Number, required : true },
    credits       : { type : Number, required : true },
    maxQtyPerUser : { type : Number, required : true },
    publish       : { type : Boolean, default : false },
    remarks       : { type : String, default : '' },
    images        : [{ type : mongoose.Schema.Types.ObjectId, ref : 'Image', default : [] }],
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
 * @typedef Topup
 */
const Topup = mongoose.model('Topup', schema)

module.exports = Topup
