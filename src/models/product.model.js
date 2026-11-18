const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const scheme = mongoose.Schema(
  {
    productId       : { type : String, required : true },
    productType     : { type : String, enum : ["treatment", "product"], default : "product" },
    category        : { type : mongoose.Schema.Types.ObjectId, ref : "Category", default : null },
    images          : [{ type : mongoose.Schema.Types.ObjectId, ref : "Image", default : [] }],
    description     : {
      zh : { type : String, default : "" },
      en : { type : String, default : "" }
    },
    reviews         : [{ type : mongoose.Schema.Types.ObjectId, ref : "Review", default : [] }],
    ingredients     : {
      zh : { type : String, default : "" },
      en : { type : String, default : "" }
    },
    madeIn          : {
      zh : { type : String, default : "香港" },
      en : { type : String, default : "Hong Kong" }
    },
    nutritionInfo   : {
      servingText  : {
        zh : {
          type    : String,
          default : "每食用份量100g"
        },
        en : {
          type    : String,
          default : "Per serving size 100g"
        }
      },
      calories     : { type : Number, default : 0 },
      protein      : { type : Number, default : 0 },
      fat          : {
        saturatedFat : { type : Number, default : 0 },
        transFat     : { type : Number, default : 0 },
        total        : { type : Number, default : 0 }
      },
      carbohydrate : {
        fibre  : { type : Number, default : 0 },
        sugars : { type : Number, default : 0 },
        total  : { type : Number, default : 0 }
      },
      sodium       : { type : Number, default : 0 }
    },
    addons          : [{
      name  : {
        zh : { type : String },
        en : { type : String }
      },
      price : { type : Number }
    }],
    edibleMethods   : { type : String },
    edibleMethodsEn : { type : String },
    soldOut         : { type : Boolean, default : false },
    publish         : { type : Boolean, default : false },
    featured        : { type : Boolean, default : false },
    internalName    : { type : String, required : true },
    name            : {
      zh : { type : String, required : true },
      en : { type : String, required : true }
    },
    price           : { type : Number, required : true },
    discountPrice   : { type : Number, default : 0 },// override price for checkout
    vipPrice        : { type : Number, default : 0 },
    maxPurchaseQtyPerOrder : { type : Number, default : 0, min : 0 },

    // discount tiers for this product
    discount : [{
      type    : mongoose.Schema({
        quantity : Number,
        value    : Number
      }),
      default : []
    }],
    //enable / disable discount tiers
    discountTierEnabled : { type : Boolean, default : false },
    createdBy  : { type : mongoose.Schema.Types.ObjectId, ref : "User" },
    lastEditBy : { type : mongoose.Schema.Types.ObjectId, ref : "User" },
    archive    : { type : Boolean, default : false },

    // bundled item: e.g.試食裝
    isBundled   : { type : Boolean, default : false },
    bundleItems : [{
      product  : { type : mongoose.Schema.Types.ObjectId, ref : "Product", required : true },
      quantity : { type : Number, required : true }
    }]
  },
  {
    timestamps : true
  }
);

// add plugin that converts mongoose to json
scheme.plugin(toJSON);
scheme.plugin(paginate);

/**
 * @typedef Product
 */
const Product = mongoose.model("Product", scheme);

module.exports = Product;
