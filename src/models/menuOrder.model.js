const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const menuOrderItemSchema = mongoose.Schema(
  {
    type  : {
      type     : String,
      enum     : ['group', 'category'],
      required : true,
    },
    refId : {
      type     : mongoose.Schema.Types.ObjectId,
      required : true,
    },
  },
  { _id : false }
);

const menuOrderSchema = mongoose.Schema(
  {
    items : {
      type    : [menuOrderItemSchema],
      default : [],
    },
  },
  {
    timestamps : true,
  }
);

menuOrderSchema.plugin(toJSON);

/**
 * Get the single MenuOrder document, creating it if it doesn't exist.
 * @returns {Promise<MenuOrder>}
 */
menuOrderSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({ items : [] });
  }
  return doc;
};

/**
 * @typedef MenuOrder
 */
const MenuOrder = mongoose.model('MenuOrder', menuOrderSchema);

module.exports = MenuOrder;

