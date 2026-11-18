const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");
const { dateStringInHongKong } = require("../utils/date");
const { locations } = require("../config/locations");
const _ = require("underscore");
const validator = require("validator");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const randomstring = require("randomstring");

const scheme = mongoose.Schema(
  {
    createdBy        : { type : mongoose.Schema.Types.ObjectId, ref : "User" },
    email            : {
      type : String, required : true, trim : true, lowercase : true,
      validate (value) {
        if (!validator.isEmail(value)) {
          throw new Error("電郵地址不正確");
        }
      }
    },
    recipient        : { type : String, default : null, trim : true },
    phone            : { type : String, required : true },
    area             : { type : String, default : null, enum : [...Object.keys(locations), null] },//hk, kln, nt
    district         : { type : String, default : null, enum : [...Object.keys({ ...locations.hk, ...locations.kln, ...locations.nt }), null] },//東區, 北區...
    subDistrict      : { type : String, default : null, enum : [..._.flatten(_.map(locations, _.values)), null] },//太古, 北角...
    deliveryDay      : { type : String, default : null }, //format YYYY-MM-DD
    deliveryTimeSlot : { type : String, default : null }, //delivery timeslot string for courier
    fullAddress      : { type : String, default : null }, //delivery full address
    orderNumber      : { type : String }, //serial number: OPT2022010100001

    //new added for pickup
    deliveryType       : { type : String, default : "delivery" },
    pickupLocationCode : { type : String, default : null },

    items : [{
      product   : { type : mongoose.Schema.Types.ObjectId, ref : "Product", required : true },
      quantity  : { type : Number, required : true },
      unitPrice : { type : Number, required : true },
      addons    : {
        name  : {
          zh : { type : String },
          en : { type : String }
        },
        price : { type : Number }
      }
    }],
    total : { type : Number, required : true },//original price
    flag  : { type : Boolean, default : false },
    /**
     * voucher code
     */
    voucherUsed          : { type : mongoose.Schema.Types.ObjectId, ref : "Voucher", default : null },//voucher code adopted to order
    voucherDiscountTotal : { type : Number, default : null },//discounted value

    /**
     * auto discount adopted to order, *backend
     * e.g. category discounts
     */
    autoDiscountTiersAdopted : [{
      discountType : {
        type : String,
        enum : ["catDiscount", "productDiscount"]
      },
      desc         : {
        type : String
      }
    }],
    autoDiscountTotal        : { type : Number, default : null },// auto discount value

    buyXGetYFreeAdopted : [{
      discountType : {
        type : String,
        enum : ["buyXGetYFreeDiscount"]
      },
      desc         : {
        type : String
      },
      freeItems    : [{
        product      : { type : mongoose.Schema.Types.ObjectId, ref : "Product" },
        sellingPrice : { type : Number }
      }]
    }],

    buyXGetYFreeDiscountTotal : { type : Number, default : null },// auto discount value

    vipTierDiscount      : [{
      discountType : {
        type : String,
        enum : ["gold", "diamond"]
      },
      desc         : {
        type : String
      }
    }],
    vipTierDiscountTotal : { type : Number, default : null },// auto discount value

    isWeekEndDelivery : { type : Boolean, default : false }, //additional $10 for weekend delivery
    deliveryFee       : { type : Number, default : 0 }, // 68 if total < $300, free if total >= $300
    paidTotal         : { type : Number, required : true },//backend calculate paid by user $ with discount
    creditsGained     : { type : Number, default : 0 }, // gain credit, *after order is paid
    creditsUsed       : { type : Number, default : 0 }, // deduct from user model, *after order is paid
    payment           : {
      paymentType   : {
        type : String, required : true, enum : ["qfpay", "admin"]
      },
      paymentRef    : { type : String, default : null },// ref PaymentGatewayID, DO NOT store the whole fucking payment object!!!
      paymentStatus : { type : String, default : "pending_payment", enum : ["pending_payment", "completed", "failed", "refunded"] }
    },

    /**
     * order status
     * 1. pending_payment: default status after order is submitted
     * 2. payment_failed: payment status = failed, ref to payment.paymentStatus and payment object return from payment gateway
     * 3. confirmed: payment status = completed, ref to payment.paymentStatus and payment object return from payment gateway
     * 4. cancelled: cancel by admin, TODO: change payment.paymentStatus to refunded and initiate refund request to payment gateway
     */
    orderStatus : {
      type : String, enum : ["pending_payment", "payment_failed", "confirmed", "cancelled"], default : "pending_payment"
    },
    accessCode  : {
      type : String
    },
    delivery    : {
      courier       : { type : String, default : "sf", enum : ["sf", "xhsc"] }, //SF delivery only currently
      billNo        : { type : String, default : null },
      clientOrderID : { type : String, default : null },
      wayBillDoc    : {
        url   : { type : String, default : null },
        token : { type : String, default : null }
      }
    },

    // lucky draw prize
    prize : {
      product : { type : mongoose.Schema.Types.ObjectId, ref : "Product" },
      type    : { type : String, enum : ["cash", "item"] },
      amount  : { type : Number }
    },

    // shopping gift
    gift : {
      product : { type : mongoose.Schema.Types.ObjectId, ref : "Product" },
      type    : { type : String, enum : ["other", "item"] },
      amount  : { type : Number },
      giftRef : { type : mongoose.Schema.Types.ObjectId, ref : "Gift" },
      rules   : { type : Object }
    },

    statsComputed : { type : Boolean, default : false },

    printed : { type : Boolean, default : false },

    remarks : { type : String, default : "" }
  },
  {
    timestamps : true
  }
);

// sequence instance
const sequence = sequenceGenerator("order");

scheme.pre("save", function(next) {
  const doc = this;

  // prevent double calling twice for update.
  if (!doc.accessCode) {
    doc.accessCode = randomstring.generate();
  }

  // prevent double calling twice for update.
  if (!doc.orderNumber) {
    // get the next sequence
    sequence.next(function(nextSeq) {
      const date = dateStringInHongKong(); //20220101
      doc.orderNumber = "BBQ" + date + nextSeq.toString().padStart(5, "0"); //OPT2022010100001
      return next();
    });
  }
});

// Create a sequence
function sequenceGenerator (name) {
  var SequenceSchema, Sequence;

  SequenceSchema = new mongoose.Schema({
    nextSeqNumber : { type : Number, default : 100 }
  });

  Sequence = mongoose.model(name + "Seq", SequenceSchema);

  return {
    next : function(callback) {
      Sequence.find(function(err, data) {
        if (err) {
          throw (err);
        }

        if (data.length < 1) {
          // create if doesn't exist create and return first
          Sequence.create({}, function(err, seq) {
            if (err) {
              throw (err);
            }
            callback(seq.nextSeqNumber);
          });
        } else {
          // update sequence and return next
          Sequence.findByIdAndUpdate(data[0]._id, { $inc : { nextSeqNumber : 1 } }, { new : true }, function(err, seq) {
            if (err) {
              throw (err);
            }
            callback(seq.nextSeqNumber);
          });
        }
      });
    }
  };
}

// add plugin that converts mongoose to json
scheme.plugin(toJSON);
scheme.plugin(paginate);
scheme.plugin(aggregatePaginate);

/**
 * @typedef Order
 */
const Order = mongoose.model("Order", scheme);

module.exports = Order;
