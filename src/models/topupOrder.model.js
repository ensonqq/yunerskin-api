const mongoose = require('mongoose')
const { toJSON, paginate } = require('./plugins')
const { boolean } = require("joi");
const Joi = require("joi");
const randomstring = require("randomstring");
const { dateStringInHongKong } = require("../utils/date");
const validator = require("validator");

//TODO: admin topup credits also create records!
const schema = mongoose.Schema(
  {
    createdBy     : { type : mongoose.Schema.Types.ObjectId, ref : 'User', required : true },
    issuedTo      : { type : mongoose.Schema.Types.ObjectId, ref : 'User', required : true },
    email         : {
      type : String, required : true, trim : true, lowercase : true,
      validate (value) {
        if (!validator.isEmail(value)) {
          throw new Error('電郵地址不正確');
        }
      },
    },
    topupCard     : { type : mongoose.Schema.Types.ObjectId, ref : 'Topup', default : null },
    topupValue    : { type : Number, required : true },
    price         : { type : Number, required : true },
    orderNumber   : { type : String }, //serial number: TU2022010100001
    payment       : {
      paymentType   : { type : String, required : true, enum : ['qfpay'] },
      paymentRef    : { type : String, default : null },// ref PaymentGatewayID, DO NOT store the whole fucking payment object!!!
      paymentStatus : { type : String, default : 'pending_payment', enum : ['pending_payment', 'completed', 'failed', 'refunded'] },
    },
    statsComputed : { type : Boolean, default : false, },
    accessCode    : {
      type : String,
    },

    orderStatus : {
      type : String, enum : ['pending_payment', 'payment_failed', 'confirmed', 'cancelled'], default : 'pending_payment',
    },
    remarks     : { type : String, default : '' },
  },
  {
    timestamps : true,
  },
)

// sequence instance
const sequence = sequenceGenerator('topupOrder')

schema.pre('save', function (next) {
  const doc = this

  // prevent double calling twice for update.
  if (!doc.accessCode) {
    //auto gen order access code
    doc.accessCode = randomstring.generate()
  }

  // prevent double calling twice for update.
  if (!doc.orderNumber) {
    // get the next sequence
    sequence.next(function (nextSeq) {
      const date = dateStringInHongKong() //20220101
      doc.orderNumber = 'TU' + date + nextSeq.toString().padStart(5, '0') //OPT2022010100001
      return next()
    })
  }
})

// Create a sequence
function sequenceGenerator (name) {
  var SequenceSchema, Sequence;

  SequenceSchema = new mongoose.Schema({
    nextSeqNumber : { type : Number, default : 100 }
  });

  Sequence = mongoose.model(name + 'Seq', SequenceSchema);

  return {
    next : function (callback) {
      Sequence.find(function (err, data) {
        if (err) {
          throw(err);
        }

        if (data.length < 1) {
          // create if doesn't exist create and return first
          Sequence.create({}, function (err, seq) {
            if (err) {
              throw(err);
            }
            callback(seq.nextSeqNumber);
          });
        } else {
          // update sequence and return next
          Sequence.findByIdAndUpdate(data[0]._id, { $inc : { nextSeqNumber : 1 }, }, { new : true }, function (err, seq) {
            if (err) {
              throw(err);
            }
            callback(seq.nextSeqNumber);
          })
        }
      })
    }
  };
}


// virtual tobe exported
schema.set('toObject', { virtuals : true });
schema.set('toJSON', { virtuals : true });

// add plugin that converts mongoose to json
schema.plugin(toJSON)
schema.plugin(paginate)

/**
 * @typedef TopupOrder
 */
const TopupOrder = mongoose.model('TopupOrder', schema)

module.exports = TopupOrder
